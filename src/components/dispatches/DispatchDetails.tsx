
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Tables } from '@/integrations/supabase/types';

type Dispatch = Tables<'dispatches'>;

interface DispatchDetailsProps {
  dispatch: Dispatch;
  onClose: () => void;
}

export function DispatchDetails({ dispatch, onClose }: DispatchDetailsProps) {

  // TODO: Fetch dispatch items and customer details
  const { data: dispatchItems = [] } = useQuery({
    queryKey: ['dispatch-items', dispatch.id],
    queryFn: async () => {
        // This will be implemented later
        return [];
    }
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Detalles del Despacho</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">La lógica para mostrar los detalles del despacho se implementará aquí.</p>
            <div className="flex justify-end">
                <Button onClick={onClose}>Cerrar</Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
