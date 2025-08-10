
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Eye, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DispatchForm } from '@/components/dispatches/DispatchForm';
import { DispatchDetails } from '@/components/dispatches/DispatchDetails';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Dispatch = Tables<'dispatches'> & {
    customers: Pick<Tables<'customers'>, 'name'> | null;
};

const ITEMS_PER_PAGE = 10;

export function Dispatches() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<Dispatch | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dispatchToDelete, setDispatchToDelete] = useState<Dispatch | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dispatches = [], isLoading } = useQuery<Dispatch[]>(({
    queryKey: ['dispatches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatches')
        .select(`
          *,
          customers(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  }));

  // NOTE: Delete mutation will need to be updated to handle inventory restoration logic
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // This needs a proper RPC function to restore inventory correctly.
      // For now, it just deletes the dispatch record.
      const { error } = await supabase
        .from('dispatches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast({
        title: "Despacho eliminado",
        description: "El despacho ha sido eliminado. La restauración de inventario debe hacerse manualmente por ahora.",
      });
      setShowDeleteDialog(false);
      setDispatchToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el despacho.",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
      setDispatchToDelete(null);
    },
  });

  const filteredDispatches = dispatches.filter(dispatch =>
    dispatch.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDispatches.length / ITEMS_PER_PAGE);
  const paginatedDispatches = filteredDispatches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleEdit = (dispatch: Dispatch) => {
    setEditingDispatch(dispatch);
    setShowForm(true);
  };

  const handleDelete = (dispatch: Dispatch) => {
    setDispatchToDelete(dispatch);
    setShowDeleteDialog(true);
  };

  const handleViewDetails = (dispatch: Dispatch) => {
    setSelectedDispatch(dispatch);
    setShowDetails(true);
  };

  const handleNewDispatch = () => {
    setEditingDispatch(null);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
      setShowForm(false);
      setEditingDispatch(null);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando despachos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex items-center space-x-4">
          <Truck className="w-12 h-12 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestión de Despachos</h1>
          </div>
        </div>
        <Button onClick={handleNewDispatch} className="mt-4 md:mt-0">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Despacho
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Despachos</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDispatches.map((dispatch) => (
                <TableRow key={dispatch.id}>
                  <TableCell>{dispatch.dispatch_date ? format(new Date(dispatch.dispatch_date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                  <TableCell>{dispatch.customers?.name || 'Cliente Anónimo'}</TableCell>
                  <TableCell>
                    <Badge variant={dispatch.status === 'completado' ? 'default' : 'secondary'}>
                      {dispatch.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(dispatch)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(dispatch)}
                        disabled // Editing not implemented yet
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(dispatch)}
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
          <DispatchForm dispatch={editingDispatch} onClose={handleCloseForm} />
      )}

      {showDetails && selectedDispatch && (
          <DispatchDetails dispatch={selectedDispatch} onClose={() => setShowDetails(false)} />
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el despacho. La restauración del inventario no está implementada aún.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (dispatchToDelete) {
                  deleteMutation.mutate(dispatchToDelete.id);
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
