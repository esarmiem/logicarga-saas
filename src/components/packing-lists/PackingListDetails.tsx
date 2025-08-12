
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';

type PackingList = Tables<'packing_lists'>;

interface PackingListDetailsProps {
  packingList: PackingList;
  onClose: () => void;
}

export function PackingListDetails({ packingList, onClose }: PackingListDetailsProps) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detalles del Packing List</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-muted-foreground">ID:</span>
                  <p className="text-foreground font-mono text-sm">{packingList.id}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Proveedor:</span>
                  <p className="text-foreground">{packingList.supplier_name || 'No especificado'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-muted-foreground">Estado:</span>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(packingList.status)}>
                      {packingList.status}
                    </Badge>
                  </div>
                </div>
                 <div>
                  <span className="font-medium text-muted-foreground">Fecha de Llegada:</span>
                  <p className="text-foreground">
                    {format(new Date(packingList.arrival_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Aquí se podrían agregar los items del packing list cuando esa lógica exista */}
          {/* 
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">Items Recibidos</h3>
            <p className="text-muted-foreground">Aún no se ha implementado la visualización de items.</p>
          </div> 
          */}

          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-muted-foreground">Fecha de Creación:</span>
                <p className="text-foreground">
                  {format(new Date(packingList.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Última Actualización:</span>
                <p className="text-foreground">
                  {format(new Date(packingList.updated_at), 'dd/MM/yyyy HH:mm')}
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
