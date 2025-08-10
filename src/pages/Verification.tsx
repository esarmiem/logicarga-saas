
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, ScanLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type PendingItem = Tables<'inventory_items'> & {
  products: Pick<Tables<'products'>, 'name' | 'sku'> | null;
};

export function Verification() {
  const [serialNumber, setSerialNumber] = useState('');
  const [locationBarcode, setLocationBarcode] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for items pending verification
  const { data: pendingItems, isLoading } = useQuery<PendingItem[]>({ 
    queryKey: ['pending_verification_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, products(name, sku)')
        .eq('status', 'en_verificacion')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Mutation to call the RPC function
  const mutation = useMutation({
    mutationFn: async ({ serial, location }: { serial: string; location: string }) => {
      const { error } = await supabase.rpc('verify_and_place_item', {
        p_serial_number: serial,
        p_location_barcode: location,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: `Item ${serialNumber} verificado y ubicado correctamente.` });
      queryClient.invalidateQueries({ queryKey: ['pending_verification_items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      // Clear inputs after success
      setSerialNumber('');
      setLocationBarcode('');
    },
    onError: (error: Error) => {
      toast({ title: "Error de Verificación", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber || !locationBarcode) {
      toast({ title: "Campos requeridos", description: "Debes proporcionar N/S del item y C/B de la ubicación.", variant: "destructive" });
      return;
    }
    mutation.mutate({ serial: serialNumber, location: locationBarcode });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <CheckSquare className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Verificación y Ubicación</h1>
            <p className="text-muted-foreground">Escanea un item y su ubicación para finalizar el ingreso.</p>
          </div>
        </div>
      </div>

      {/* Scanning Form */}
      <Card>
        <CardHeader>
          <CardTitle>Interfaz de Escaneo</CardTitle>
          <CardDescription>Introduce el número de serie del item y el código de barras de la ubicación.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <Label htmlFor="serial_number">N/S del Item</Label>
              <Input id="serial_number" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Escanear o escribir N/S..." />
            </div>
            <div className="flex-1 w-full">
              <Label htmlFor="location_barcode">C/B de la Ubicación</Label>
              <Input id="location_barcode" value={locationBarcode} onChange={e => setLocationBarcode(e.target.value)} placeholder="Escanear o escribir C/B..." />
            </div>
            <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
              <ScanLine className="w-4 h-4 mr-2" />
              {mutation.isPending ? 'Verificando...' : 'Confirmar Ubicación'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items Pendientes de Verificación</CardTitle>
          <CardDescription>Esta es la lista de items que han sido cargados desde una packing list pero aún no tienen una ubicación física.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N/S</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4}>Cargando items pendientes...</TableCell></TableRow>}
              {pendingItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.serial_number}</TableCell>
                  <TableCell>{item.products?.name}</TableCell>
                  <TableCell className="font-mono">{item.products?.sku}</TableCell>
                  <TableCell>{item.meterage ? `${item.meterage} m` : item.weight_kg ? `${item.weight_kg} kg` : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
