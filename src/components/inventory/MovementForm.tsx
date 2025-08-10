
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

// Define types based on your schema
type InventoryItem = Tables<'inventory_items'> & { products: { name: string } | null };
type Location = Tables<'locations'>;

interface MovementFormProps {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function MovementForm({ item, onClose, onSuccess }: MovementFormProps) {
  const [newLocationId, setNewLocationId] = useState<string>('');
  const [reason, setReason] = useState('');

  // Fetch all available locations to populate the dropdown
  const { data: locations, isLoading: isLoadingLocations } = useQuery<Location[]>({ 
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // Mutation to call the RPC function
  const moveItemMutation = useMutation({
    mutationFn: async ({ newLocationId, reason }: { newLocationId: string; reason: string }) => {
      const { error } = await supabase.rpc('move_inventory_item', {
        p_item_id: item.id,
        p_new_location_id: newLocationId,
        p_reason: reason || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Movimiento Exitoso", description: `El item ${item.serial_number} ha sido movido.` });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "Error en el Movimiento", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationId) {
      toast({ title: "Error de Validación", description: "Debes seleccionar una nueva ubicación.", variant: "destructive" });
      return;
    }
    moveItemMutation.mutate({ newLocationId, reason });
  };

  const formatLocation = (loc: Location) => `${loc.aisle}-${loc.rack}-${loc.level}-${loc.position}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mover Item de Inventario</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <CardDescription>Mueve el item a una nueva ubicación en el almacén.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 border rounded-md bg-muted">
              <p className="font-semibold text-sm">Item a Mover</p>
              <p className="text-lg font-mono text-primary">{item.serial_number}</p>
              <p className="text-sm text-muted-foreground">{item.products?.name}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-location">Nueva Ubicación *</Label>
              <Select value={newLocationId} onValueChange={setNewLocationId} required>
                <SelectTrigger id="new-location">
                  <SelectValue placeholder={isLoadingLocations ? "Cargando ubicaciones..." : "Selecciona una ubicación"} />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {formatLocation(loc)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Razón del Movimiento (Opcional)</Label>
              <Textarea 
                id="reason" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                placeholder="Ej: Reorganización de pasillo, preparación para despacho..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={moveItemMutation.isPending}>
                {moveItemMutation.isPending ? 'Moviendo...' : 'Confirmar Movimiento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
