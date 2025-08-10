
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Tables } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Define types for the new dispatch logic
type Dispatch = Tables<'dispatches'>;
type Customer = Tables<'customers'>;
type InventoryItem = Tables<'inventory_items'> & { 
  products: Pick<Tables<'products'>, 'name' | 'sku' | 'product_type'> | null 
};

interface DispatchItemInput {
  inventory_item_id: string;
  dispatched_meterage?: number;
  // For display purposes
  serial_number: string;
  product_name: string;
  available_meterage?: number | null;
  product_type: 'rollo_tela' | 'tanque_ibc' | null;
}

interface DispatchFormProps {
  dispatch?: Dispatch | null;
  onClose: () => void;
}

function InventoryItemSearcher({ onItemSelected }: { onItemSelected: (item: InventoryItem) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: items, isLoading } = useQuery<InventoryItem[]>({ 
    queryKey: ['available_inventory', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('*, products(name, sku, product_type)')
        .eq('status', 'disponible')
        .order('received_at', { ascending: true }); // FIFO

      if (searchTerm) {
        query = query.or(`serial_number.ilike.%${searchTerm}%,products.name.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    }
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Buscar Item de Inventario Disponible</DialogTitle></DialogHeader>
      <Input 
        placeholder="Buscar por N/S o nombre de producto..." 
        value={searchTerm} 
        onChange={e => setSearchTerm(e.target.value)} 
        className="my-4"
      />
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading && <p>Buscando...</p>}
        <ul className="space-y-2">
          {items?.map(item => (
            <li key={item.id} className="flex justify-between items-center p-2 border rounded-md">
              <div>
                <p className="font-mono font-semibold">{item.serial_number}</p>
                <p className="text-sm text-muted-foreground">{item.products?.name}</p>
                {item.meterage && <p className="text-xs">{item.meterage}m disponibles</p>}
              </div>
              <Button size="sm" onClick={() => onItemSelected(item)}>Seleccionar</Button>
            </li>
          ))}
        </ul>
      </div>
    </DialogContent>
  );
}

export function DispatchForm({ dispatch, onClose }: DispatchFormProps) {
  const [customerId, setCustomerId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [dispatchItems, setDispatchItems] = useState<DispatchItemInput[]>([]);
  const [isSearcherOpen, setIsSearcherOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const itemsToSubmit = dispatchItems.map(item => ({
        inventory_item_id: item.inventory_item_id,
        dispatched_meterage: item.product_type === 'rollo_tela' ? item.dispatched_meterage : undefined
      }));

      const { error } = await supabase.rpc('create_dispatch', {
        p_customer_id: customerId,
        p_notes: notes,
        p_dispatch_items: itemsToSubmit
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast({ title: "Despacho Creado", description: "El despacho ha sido creado exitosamente." });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear despacho", description: error.message, variant: "destructive" });
    },
  });

  const handleItemSelected = (item: InventoryItem) => {
    if (dispatchItems.some(i => i.inventory_item_id === item.id)) {
      toast({ title: "Item duplicado", description: "Este item ya ha sido añadido al despacho.", variant: "default" });
      return;
    }
    const newItem: DispatchItemInput = {
      inventory_item_id: item.id,
      serial_number: item.serial_number,
      product_name: item.products?.name || 'N/A',
      product_type: item.products?.product_type || null,
      available_meterage: item.meterage,
      dispatched_meterage: item.meterage || undefined, // Default to full amount
    };
    setDispatchItems(prev => [...prev, newItem]);
    setIsSearcherOpen(false);
  };

  const handleItemChange = (index: number, field: 'dispatched_meterage', value: string) => {
    const updatedItems = [...dispatchItems];
    const numericValue = parseFloat(value);
    if (field === 'dispatched_meterage') {
        if (numericValue > (updatedItems[index].available_meterage || 0)) {
            toast({ title: "Error de metraje", description: "No se puede despachar más metraje del disponible.", variant: "destructive" });
            return;
        }
        updatedItems[index].dispatched_meterage = numericValue;
    }
    setDispatchItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setDispatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
        toast({ title: "Error de validación", description: "Debe seleccionar un cliente.", variant: "destructive" });
        return;
    }
    if (dispatchItems.length === 0) {
        toast({ title: "Error de validación", description: "Debe añadir al menos un item al despacho.", variant: "destructive" });
        return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{dispatch ? 'Editar Despacho' : 'Nuevo Despacho'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="customer">Cliente</Label>
                    <Select value={customerId} onValueChange={setCustomerId} required>
                        <SelectTrigger><SelectValue placeholder="Seleccionar un cliente..." /></SelectTrigger>
                        <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales del despacho..." />
                </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items para Despachar</Label>
                <Dialog open={isSearcherOpen} onOpenChange={setIsSearcherOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Buscar Item</Button>
                  </DialogTrigger>
                  <InventoryItemSearcher onItemSelected={handleItemSelected} />
                </Dialog>
              </div>
              <div className="p-2 border rounded-md min-h-[150px]">
                {dispatchItems.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-10">Añade items al despacho usando el botón "Buscar Item".</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>N/S</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Metraje a Despachar</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dispatchItems.map((item, index) => (
                                <TableRow key={item.inventory_item_id}>
                                    <TableCell className="font-mono">{item.serial_number}</TableCell>
                                    <TableCell>{item.product_name}</TableCell>
                                    <TableCell>
                                        {item.product_type === 'rollo_tela' ? (
                                            <Input 
                                                type="number" 
                                                value={item.dispatched_meterage || ''} 
                                                onChange={e => handleItemChange(index, 'dispatched_meterage', e.target.value)}
                                                placeholder={`Max: ${item.available_meterage}m`}
                                                className="w-32"
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Crear Despacho'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
