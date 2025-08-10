
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { PackingListForm } from '@/components/packing-lists/PackingListForm';
import { format } from 'date-fns';

type PackingList = Tables<'packing_lists'>;

export function PackingLists() {
  const [showForm, setShowForm] = useState(false);

  const { data: packingLists, isLoading, error } = useQuery<PackingList[]>({ 
    queryKey: ['packing_lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packing_lists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p>Cargando packing lists...</p>;
  if (error) return <p>Error al cargar: {error.message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <ClipboardList className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Recepción de Mercancía</h1>
            <p className="text-muted-foreground">Carga y gestiona las listas de empaque de proveedores.</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Cargar Packing List
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Cargas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha de Carga</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packingLists?.map((list) => (
                <TableRow key={list.id}>
                  <TableCell>{format(new Date(list.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{list.supplier_name}</TableCell>
                  <TableCell><Badge>{list.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showForm && (
        <PackingListForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
