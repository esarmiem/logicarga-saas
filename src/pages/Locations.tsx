
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { LocationForm } from '@/components/locations/LocationForm';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Location = Tables<'locations'>;

export function Locations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const queryClient = useQueryClient();

  const { data: locations, isLoading, error } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('aisle', { ascending: true })
        .order('rack', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: items, error: checkError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('location_id', id)
        .limit(1);

      if (checkError) throw new Error("Error al verificar inventario: " + checkError.message);
      if (items && items.length > 0) {
        throw new Error('No se puede eliminar. La ubicación contiene items de inventario.');
      }

      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: "Ubicación eliminada", description: "La ubicación ha sido eliminada exitosamente." });
      setShowDeleteDialog(false);
      setLocationToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setShowDeleteDialog(false);
      setLocationToDelete(null);
    },
  });

  const filteredLocations = locations?.filter(loc => 
    `${loc.aisle}-${loc.rack}-${loc.level}-${loc.position}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleDelete = (location: Location) => {
    setLocationToDelete(location);
    setShowDeleteDialog(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLocation(null);
  };

  if (isLoading) return <p>Cargando ubicaciones...</p>;
  if (error) return <p>Error al cargar ubicaciones: {error.message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex items-center space-x-4">
          <MapPin className="w-12 h-12 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestión de Ubicaciones</h1>
            <p className="text-muted-foreground">Define las coordenadas del almacén.</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2 mt-4 md:mt-0">
          <Plus className="h-4 w-4" />
          Nueva Ubicación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ubicaciones</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por coordenada o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coordenada</TableHead>
                <TableHead>Código de Barras</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-mono">{`${location.aisle}-${location.rack}-${location.level}-${location.position}`}</TableCell>
                  <TableCell className="font-mono">{location.barcode || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(location)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(location)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showForm && (
        <LocationForm
          location={editingLocation}
          onClose={handleFormClose}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            handleFormClose();
          }}
        />
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Solo puedes eliminar ubicaciones que no contengan inventario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => locationToDelete && deleteMutation.mutate(locationToDelete.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
