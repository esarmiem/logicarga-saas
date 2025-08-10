
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Warehouse, Search, Filter, Move } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MovementForm } from '@/components/inventory/MovementForm';
import type { Tables } from '@/integrations/supabase/types';

// Define a more detailed type for our query result
type InventoryItem = Tables<'inventory_items'> & {
  products: Pick<Tables<'products'>, 'name' | 'sku'> | null;
  locations: Pick<Tables<'locations'>, 'aisle' | 'rack' | 'level' | 'position'> | null;
};

const formatLocation = (location: InventoryItem['locations']) => {
  if (!location) return 'Sin ubicación';
  return `${location.aisle}-${location.rack}-${location.level}-${location.position}`;
};

export function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryItem['status'] | 'all'>('all');
  const [itemToMove, setItemToMove] = useState<InventoryItem | null>(null);
  const queryClient = useQueryClient();

  const { data: inventoryItems, isLoading, error } = useQuery<InventoryItem[]>({ 
    queryKey: ['inventory_items', { searchTerm, statusFilter }],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          products (name, sku),
          locations (aisle, rack, level, position)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`serial_number.ilike.%${searchTerm}%,products.name.ilike.%${searchTerm}%,products.sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const statusOptions = ['en_verificacion', 'disponible', 'reservado', 'despachado', 'dado_de_baja'];

  const getStatusBadgeVariant = (status: InventoryItem['status']) => {
    switch (status) {
      case 'disponible': return 'default';
      case 'reservado': return 'destructive';
      case 'despachado': return 'outline';
      case 'en_verificacion': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleCloseForm = () => {
    setItemToMove(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
    handleCloseForm();
  };

  if (isLoading) return <p>Cargando inventario...</p>;
  if (error) return <p>Error al cargar el inventario: {error.message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Warehouse className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Inventario Físico</h1>
            <p className="text-muted-foreground">Vista de todos los items rastreables en el almacén.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Inventario</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por N/S, Nombre de producto o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Select value={statusFilter} onValueChange={(value: InventoryItem['status'] | 'all') => setStatusFilter(value)}>
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Filtrar por estado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N/S</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Detalles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.serial_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.products?.name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">SKU: {item.products?.sku || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{formatLocation(item.locations)}</TableCell>
                  <TableCell>{item.meterage ? `${item.meterage} m` : item.weight_kg ? `${item.weight_kg} kg` : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setItemToMove(item)} disabled={item.status !== 'disponible'}>
                      <Move className="w-4 h-4 mr-2" />
                      Mover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {itemToMove && (
        <MovementForm 
          item={itemToMove}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
