
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { PackingListForm } from '@/components/packing-lists/PackingListForm';
import { PackingListDetails } from '@/components/packing-lists/PackingListDetails';
import { format } from 'date-fns';

type PackingList = Tables<'packing_lists'>;

export function PackingLists() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPackingList, setSelectedPackingList] = useState<PackingList | null>(null);

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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completado':
        return 'default';
      case 'procesando':
        return 'secondary';
      case 'discrepancia':
        return 'destructive';
      case 'pendiente':
      default:
        return 'outline';
    }
  };

  if (isLoading) return <p>Cargando packing lists...</p>;
  if (error) return <p>Error al cargar: {error.message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex items-center space-x-4">
          <ClipboardList className="w-12 h-12 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Recepción de Mercancía</h1>
            <p className="text-muted-foreground">Carga y gestiona las listas de empaque de proveedores.</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2 mt-4 md:mt-0">
          <Plus className="h-4 w-4" />
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
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packingLists?.map((list) => (
                <TableRow key={list.id}>
                  <TableCell>{format(new Date(list.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{list.supplier_name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(list.status)}>{list.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPackingList(list)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showForm && (
        <PackingListForm onClose={() => setShowForm(false)} />
      )}

      {selectedPackingList && (
        <PackingListDetails 
          packingList={selectedPackingList} 
          onClose={() => setSelectedPackingList(null)} 
        />
      )}
    </div>
  );
}
