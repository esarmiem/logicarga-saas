import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatColombianPeso } from '@/lib/currency';
import { formatBirthDate } from '@/lib/date-utils';
import type { Tables } from '@/integrations/supabase/types';

type Customer = Tables<'customers'>;

interface CustomerDetailsProps {
  customer: Customer;
  onClose: () => void;
}

export function CustomerDetails({ customer, onClose }: CustomerDetailsProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detalles del Cliente</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información Personal */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">Información Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-muted-foreground">Nombre:</span>
                  <p className="text-foreground">{customer.name}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Email:</span>
                  <p className="text-foreground">{customer.email || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Teléfono:</span>
                  <p className="text-foreground">{customer.phone || 'No especificado'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Fecha de Nacimiento:</span>
                  <p className="text-foreground">
                    {formatBirthDate(customer.birth_date)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-muted-foreground">Tipo de Cliente:</span>
                  <div className="mt-1">
                    <Badge variant={customer.customer_type === 'premium' ? 'default' : 'secondary'}>
                      {customer.customer_type || 'regular'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Estado:</span>
                  <div className="mt-1">
                    <Badge variant={customer.is_active ? 'default' : 'destructive'}>
                      {customer.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Total de Compras:</span>
                  <p className="text-foreground font-semibold">
                    {formatColombianPeso(customer.total_purchases || 0)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Última Compra:</span>
                  <p className="text-foreground">
                    {customer.last_purchase_date 
                      ? format(new Date(customer.last_purchase_date), 'dd/MM/yyyy HH:mm')
                      : 'Sin compras registradas'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Información de Dirección */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">Información de Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-muted-foreground">Dirección:</span>
                <p className="text-foreground">{customer.address || 'No especificada'}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Ciudad:</span>
                <p className="text-foreground">{customer.city || 'No especificada'}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Código Postal:</span>
                <p className="text-foreground">{customer.postal_code || 'No especificado'}</p>
              </div>
            </div>
          </div>
          {/* Información del Sistema */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-muted-foreground">Fecha de Creación:</span>
                <p className="text-foreground">
                  {format(new Date(customer.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Última Actualización:</span>
                <p className="text-foreground">
                  {format(new Date(customer.updated_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}