import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { PackingListForm } from '@/components/packing-lists/PackingListForm';
import { PackingListDetails } from '@/components/packing-lists/PackingListDetails';
import { format } from 'date-fns';

type PackingList = Tables<'packing_lists'>;

export function PackingLists() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPackingList, setSelectedPackingList] = useState<PackingList | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listToDelete, setListToDelete] = useState<PackingList | null>(null);
  const queryClient = useQueryClient();

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

  const deleteMutation = useMutation({
    mutationFn: async (packingListId: string) => {
      // First, delete associated inventory items
      const { error: itemsError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('packing_list_id', packingListId);

      if (itemsError) throw new Error(`Error eliminando items de inventario: ${itemsError.message}`);

      // Then, delete the packing list itself
      const { error: packingListError } = await supabase
        .from('packing_lists')
        .delete()
        .eq('id', packingListId);

      if (packingListError) throw new Error(`Error eliminando la packing list: ${packingListError.message}`);
    },
    onSuccess: () => {
      toast({ title: "Recepción Eliminada", description: "La recepción y sus items han sido eliminados." });
      queryClient.invalidateQueries({ queryKey: ['packing_lists'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      setShowDeleteDialog(false);
      setListToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error al Eliminar", description: error.message, variant: "destructive" });
      setShowDeleteDialog(false);
      setListToDelete(null);
    },
  });

  const handleDeleteClick = (list: PackingList) => {
    setListToDelete(list);
    setShowDeleteDialog(true);
  };

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
                  <TableCell>{list.supplier_name || 'N/A'}</TableCell>
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
                        onClick={() => handleDeleteClick(list)}
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará la recepción y todos sus items de inventario asociados. 
              Esto es permanente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => listToDelete && deleteMutation.mutate(listToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}