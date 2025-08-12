import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatColombianPeso } from '@/lib/currency';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetails({ product, onClose }: ProductDetailsProps) {
  const getStockStatus = () => {
    // Since stock_quantity doesn't exist, we'll show a generic status
    return { status: 'Verificar en Inventario', variant: 'secondary' as const };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detalles del Producto</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Imagen del Producto */}
          {product.image_url && (
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-lg overflow-hidden border">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="font-medium">Nombre:</span>
                <p className=" font-semibold text-lg">{product.name}</p>
              </div>
              <div>
                <span className="font-medium ">SKU:</span>
                <p className=" font-mono">{product.sku}</p>
              </div>
              <div>
                <span className="font-medium ">Descripción:</span>
                <p className="">{product.description || 'Sin descripción'}</p>
              </div>
              <div>
                <span className="font-medium ">Categoría:</span>
                <p className="">{product.category}</p>
              </div>
              <div>
                <span className="font-medium ">Tipo de Producto:</span>
                <p className="">{product.product_type}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="font-medium ">Estado:</span>
                <Badge variant={product.is_active ? 'default' : 'destructive'}>
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div>
                <span className="font-medium ">Medida por Defecto:</span>
                <p className="text-gray-900">{product.default_meterage ? `${product.default_meterage} m` : 'No especificada'}</p>
              </div>
              <div>
                <span className="font-medium ">Peso por Defecto:</span>
                <p className="">{product.default_weight_kg ? `${product.default_weight_kg} kg` : 'No especificado'}</p>
              </div>
              <div>
                <span className="font-medium ">Stock Status:</span>
                <div className="flex items-center gap-2">
                  <Badge variant={stockStatus.variant}>
                    {stockStatus.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Información de Fechas */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="font-medium ">Fecha de Creación:</span>
                <p className="">{format(new Date(product.created_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <div>
                <span className="font-medium ">Última Actualización:</span>
                <p className="">{format(new Date(product.updated_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 