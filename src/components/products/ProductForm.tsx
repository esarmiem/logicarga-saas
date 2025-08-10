
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

// Use the specific type from generated types
type Product = Tables<'products'>;

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    image_url: '',
    is_active: true,
    product_type: 'rollo_tela' as 'rollo_tela' | 'tanque_ibc',
    default_meterage: '',
    default_weight_kg: '',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        category: product.category || '',
        image_url: product.image_url || '',
        is_active: product.is_active,
        product_type: product.product_type || 'rollo_tela',
        default_meterage: product.default_meterage?.toString() || '',
        default_weight_kg: product.default_weight_kg?.toString() || '',
      });
    }
  }, [product]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const productData = {
        name: data.name,
        description: data.description || null,
        sku: data.sku,
        category: data.category || null,
        image_url: data.image_url || null,
        is_active: data.is_active,
        product_type: data.product_type,
        default_meterage: data.product_type === 'rollo_tela' && data.default_meterage ? parseFloat(data.default_meterage) : null,
        default_weight_kg: data.product_type === 'tanque_ibc' && data.default_weight_kg ? parseFloat(data.default_weight_kg) : null,
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: product ? "Producto actualizado" : "Producto creado",
        description: `La plantilla de producto ha sido ${product ? 'actualizada' : 'creada'} exitosamente.`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo ${product ? 'actualizar' : 'crear'} la plantilla de producto. ` + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? checked : value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {product ? 'Editar Plantilla de Producto' : 'Nueva Plantilla de Producto'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" name="sku" value={formData.sku} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input id="category" name="category" value={formData.category} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_type">Tipo de Producto *</Label>
                <Select name="product_type" value={formData.product_type} onValueChange={(value) => handleSelectChange('product_type', value)} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rollo_tela">Rollo de Tela</SelectItem>
                    <SelectItem value="tanque_ibc">Tanque IBC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.product_type === 'rollo_tela' && (
                <div className="space-y-2">
                  <Label htmlFor="default_meterage">Metraje por Defecto (m)</Label>
                  <Input id="default_meterage" name="default_meterage" type="number" value={formData.default_meterage} onChange={handleChange} placeholder="Ej: 500.00" />
                </div>
              )}

              {formData.product_type === 'tanque_ibc' && (
                <div className="space-y-2">
                  <Label htmlFor="default_weight_kg">Peso por Defecto (kg)</Label>
                  <Input id="default_weight_kg" name="default_weight_kg" type="number" value={formData.default_weight_kg} onChange={handleChange} placeholder="Ej: 1000.00" />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="image_url">URL de Imagen</Label>
                <Input id="image_url" name="image_url" type="url" value={formData.image_url} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" name="description" value={formData.description} onChange={handleChange} />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active">Plantilla activa</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending 
                  ? (product ? 'Actualizando...' : 'Creando...') 
                  : (product ? 'Actualizar Plantilla' : 'Crear Plantilla')
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
