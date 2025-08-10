
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Location = Tables<'locations'>;

interface LocationFormProps {
  location?: Location | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function LocationForm({ location, onClose, onSuccess }: LocationFormProps) {
  const [formData, setFormData] = useState({
    aisle: '',
    rack: '',
    level: '',
    position: '',
    barcode: '',
  });

  useEffect(() => {
    if (location) {
      setFormData({
        aisle: location.aisle,
        rack: location.rack,
        level: location.level,
        position: location.position,
        barcode: location.barcode || '',
      });
    }
  }, [location]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const locationData = {
        aisle: data.aisle,
        rack: data.rack,
        level: data.level,
        position: data.position,
        barcode: data.barcode || null,
      };

      if (location) {
        const { error } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', location.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('locations')
          .insert([locationData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: location ? "Ubicación actualizada" : "Ubicación creada",
        description: `La ubicación ha sido ${location ? 'actualizada' : 'creada'} exitosamente.`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo ${location ? 'actualizar' : 'crear'} la ubicación. ` + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {location ? 'Editar Ubicación' : 'Nueva Ubicación'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aisle">Pasillo *</Label>
                <Input id="aisle" name="aisle" value={formData.aisle} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rack">Estante *</Label>
                <Input id="rack" name="rack" value={formData.rack} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Nivel *</Label>
                <Input id="level" name="level" value={formData.level} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Posición *</Label>
                <Input id="position" name="position" value={formData.position} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras (Opcional)</Label>
              <Input id="barcode" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="Escanear o escribir código" />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending 
                  ? (location ? 'Actualizando...' : 'Creando...') 
                  : (location ? 'Actualizar Ubicación' : 'Crear Ubicación')
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
