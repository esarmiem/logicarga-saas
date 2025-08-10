
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PackingListFormProps {
  onClose: () => void;
}

export function PackingListForm({ onClose }: PackingListFormProps) {
  const [supplier, setSupplier] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Debes seleccionar un archivo CSV.");

      const form = new FormData();
      form.append('file', file);
      form.append('supplier', supplier);

      const { data, error } = await supabase.functions.invoke('upload-packing-list', {
        body: form,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Carga Exitosa", 
        description: `${data.itemCount} items de inventario han sido pre-registrados para la packing list ${data.packingListId}.`
      });
      queryClient.invalidateQueries({ queryKey: ['packing_lists'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error en la Carga", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Cargar Nueva Packing List</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <CardDescription>Sube un archivo CSV con los items a recibir.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor (Opcional)</Label>
              <Input id="supplier" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Nombre del proveedor..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Archivo CSV *</Label>
              <Input id="file" type="file" accept=".csv" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required />
              <p className="text-xs text-muted-foreground">Columnas requeridas: serial_number, sku, meterage, weight_kg</p>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Cargando...' : <><Upload className="w-4 h-4 mr-2" /> Cargar y Procesar</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
