import { useQuery } from '@tanstack/react-query';
import { X, Truck, User, Calendar, Hash, FileText, Package } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

type Dispatch = Tables<'dispatches'>;
type Customer = Tables<'customers'>;

// Extiende el tipo de item para incluir detalles del producto
type DispatchItemWithProduct = Tables<'dispatch_items'> & {
  inventory_items: {
    serial_number: string;
    products: {
      name: string;
      sku: string;
    } | null;
  } | null;
};

interface DispatchDetailsProps {
  dispatch: Dispatch;
  onClose: () => void;
}

// Componente para mostrar un campo de detalle con ícono
function DetailField({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-1" />
      <div>
        <p className="font-medium text-muted-foreground">{label}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function DispatchDetails({ dispatch, onClose }: DispatchDetailsProps) {
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer | null>({
    queryKey: ['customer', dispatch.customer_id],
    queryFn: async () => {
      if (!dispatch.customer_id) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', dispatch.customer_id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!dispatch.customer_id,
  });

  const { data: dispatchItems = [], isLoading: isLoadingItems } = useQuery<DispatchItemWithProduct[]>({
    queryKey: ['dispatch-items', dispatch.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatch_items')
        .select(`
          *,
          inventory_items (
            serial_number,
            products (
              name,
              sku
            )
          )
        `)
        .eq('dispatch_id', dispatch.id);

      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const getStatusVariant = (status: Dispatch['status']) => {
    switch (status) {
      case 'completado': return 'default';
      case 'pendiente': return 'secondary';
      case 'procesando': return 'outline';
      case 'cancelado': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10">
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-6 w-6" />
            <span>Detalles del Despacho</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-8 p-6">
          {/* Información General del Despacho */}
          <div className="border p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-primary">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField icon={Hash} label="ID del Despacho" value={dispatch.id.substring(0, 8)} />
              <DetailField 
                icon={Calendar} 
                label="Fecha de Despacho" 
                value={dispatch.dispatch_date ? format(new Date(dispatch.dispatch_date), 'PPP', { locale: es }) : 'No especificada'}
              />
              <div className="flex items-start space-x-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="font-medium text-muted-foreground">Estado</p>
                  <Badge variant={getStatusVariant(dispatch.status)} className="capitalize">{dispatch.status}</Badge>
                </div>
              </div>
              {isLoadingCustomer ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                customer && <DetailField icon={User} label="Cliente" value={customer.name} />
              )}
              <DetailField 
                icon={FileText} 
                label="Notas" 
                value={dispatch.notes || 'Sin notas'}
              />
            </div>
          </div>

          {/* Items del Despacho */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Items Despachados</span>
            </h3>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Número de Serie</TableHead>
                      <TableHead>Metraje Despachado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingItems ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : dispatchItems.length > 0 ? (
                      dispatchItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.inventory_items?.products?.name || 'N/A'}</TableCell>
                          <TableCell>{item.inventory_items?.products?.sku || 'N/A'}</TableCell>
                          <TableCell>{item.inventory_items?.serial_number || 'N/A'}</TableCell>
                          <TableCell>{item.dispatched_meterage ? `${item.dispatched_meterage} m` : 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                          No se encontraron items para este despacho.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}