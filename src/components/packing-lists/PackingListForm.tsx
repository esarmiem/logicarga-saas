
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Save, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getCurrentDateString } from '@/lib/currency';
import type { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

type Product = Tables<'products'>;
type InventoryItemInsert = TablesInsert<'inventory_items'> & { product_type: Enums<"product_type"> };

interface PackingListFormProps {
  onClose: () => void;
}

const initialItemState: Omit<InventoryItemInsert, 'packing_list_id'> = {
  product_id: '',
  serial_number: '',
  meterage: 0,
  weight_kg: 0,
  status: 'en_verificacion',
  product_type: 'rollo_tela', // Default value, will be updated on product selection
};

export function PackingListForm({ onClose }: PackingListFormProps) {
  const [activeTab, setActiveTab] = useState('manual');
  
  // State for CSV upload
  const [csvSupplier, setCsvSupplier] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // State for manual entry
  const [manualSupplier, setManualSupplier] = useState('');
  const [arrivalDate, setArrivalDate] = useState(getCurrentDateString());
  const [items, setItems] = useState<Omit<InventoryItemInsert, 'packing_list_id'>[]>([]);
  const [currentItem, setCurrentItem] = useState<Omit<InventoryItemInsert, 'packing_list_id'>>(initialItemState);

  const queryClient = useQueryClient();

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({ 
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const handleAddItem = () => {
    if (!currentItem.product_id || !currentItem.serial_number) {
      toast({ title: "Campos incompletos", description: "Selecciona un producto y escribe un número de serie.", variant: "destructive" });
      return;
    }
    const product = products?.find(p => p.id === currentItem.product_id);
    if (!product || !product.product_type) {
        toast({ title: "Error de producto", description: "El producto seleccionado no tiene un tipo de producto definido.", variant: "destructive" });
        return;
    }

    const itemToAdd = { ...currentItem, product_type: product.product_type };

    setItems([...items, itemToAdd]);
    setCurrentItem(initialItemState);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Mutation for CSV upload
  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Debes seleccionar un archivo CSV.");
      const form = new FormData();
      form.append('file', file);
      form.append('supplier', csvSupplier);
      const { data, error } = await supabase.functions.invoke('upload-packing-list', { body: form });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Carga Exitosa", 
        description: `${data.itemCount} items de inventario han sido pre-registrados.`
      });
      queryClient.invalidateQueries({ queryKey: ['packing_lists', 'inventory_items'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error en la Carga", description: error.message, variant: "destructive" });
    }
  });

  // Mutation for manual entry
  const manualMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Debes agregar al menos un item.");

      // 1. Create Packing List
      const { data: packingListData, error: packingListError } = await supabase
        .from('packing_lists')
        .insert({
          supplier_name: manualSupplier || null,
          arrival_date: arrivalDate,
          status: 'pendiente',
        })
        .select('id')
        .single();

      if (packingListError) throw packingListError;
      const packingListId = packingListData.id;

      // 2. Prepare and insert inventory items
      const itemsToInsert = items.map(item => ({ ...item, packing_list_id: packingListId }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await supabase.from('inventory_items').insert(itemsToInsert as any);

      if (itemsError) {
        // Attempt to clean up the created packing list if items fail
        await supabase.from('packing_lists').delete().eq('id', packingListId);
        throw itemsError;
      }
    },
    onSuccess: () => {
      toast({ 
        title: "Creación Exitosa", 
        description: "La packing list y sus items han sido creados manualmente."
      });
      queryClient.invalidateQueries({ queryKey: ['packing_lists', 'inventory_items'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error en la Creación", description: error.message, variant: "destructive" });
    }
  });

  const handleCsvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    csvMutation.mutate();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    manualMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[95vh] flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Nueva Recepción de Mercancía</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <CardDescription>Selecciona un método para registrar la llegada de mercancía.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Carga Manual</TabsTrigger>
              <TabsTrigger value="csv">Carga por CSV</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="pt-4">
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual_supplier">Proveedor (Opcional)</Label>
                    <Input id="manual_supplier" value={manualSupplier} onChange={e => setManualSupplier(e.target.value)} placeholder="Nombre del proveedor..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival_date">Fecha de Llegada *</Label>
                    <Input id="arrival_date" type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} required />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold">Añadir Item</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Producto (SKU) *</Label>
                        <Select value={currentItem.product_id} onValueChange={val => setCurrentItem({...currentItem, product_id: val})}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar SKU..." /></SelectTrigger>
                          <SelectContent>
                            {isLoadingProducts ? <SelectItem value="loading" disabled>Cargando...</SelectItem> : 
                              products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serial_number">Número de Serie *</Label>
                        <Input id="serial_number" value={currentItem.serial_number} onChange={e => setCurrentItem({...currentItem, serial_number: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meterage">Metraje (m)</Label>
                        <Input id="meterage" type="number" value={currentItem.meterage || ''} onChange={e => setCurrentItem({...currentItem, meterage: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weight_kg">Peso (kg)</Label>
                        <Input id="weight_kg" type="number" value={currentItem.weight_kg || ''} onChange={e => setCurrentItem({...currentItem, weight_kg: parseFloat(e.target.value) || 0})} />
                      </div>
                  </div>
                  <Button type="button" onClick={handleAddItem} className="w-full"><Plus className="w-4 h-4 mr-2"/>Añadir Item a la Lista</Button>
                </div>

                {items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Items a Registrar ({items.length})</h4>
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>N/S</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{products?.find(p => p.id === item.product_id)?.name}</TableCell>
                              <TableCell>{item.serial_number}</TableCell>
                              <TableCell><Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}><Trash2 className="w-4 h-4 text-red-500"/></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" disabled={manualMutation.isPending || items.length === 0}>
                    {manualMutation.isPending ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Recepción</>}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="csv" className="pt-4">
              <form onSubmit={handleCsvSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv_supplier">Proveedor (Opcional)</Label>
                  <Input id="csv_supplier" value={csvSupplier} onChange={e => setCsvSupplier(e.target.value)} placeholder="Nombre del proveedor..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Archivo CSV *</Label>
                  <Input id="file" type="file" accept=".csv" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required />
                  <p className="text-xs text-muted-foreground">Columnas requeridas: serial_number, sku, meterage, weight_kg</p>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                  <Button type="submit" disabled={csvMutation.isPending}>
                    {csvMutation.isPending ? 'Cargando...' : <><Upload className="w-4 h-4 mr-2" /> Cargar y Procesar</>}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
