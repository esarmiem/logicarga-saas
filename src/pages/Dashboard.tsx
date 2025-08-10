import { 
  LayoutDashboard, 
  Package, 
  CheckSquare, 
  Truck, 
  MapPin, 
  Clock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['wms_dashboard'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [
        { count: availableItems },
        { count: pendingVerificationItems },
        { count: dispatchesToday },
        { count: locationsCount },
        { data: recentPendingItems }
      ] = await Promise.all([
        supabase.from('inventory_items').select('id', { count: 'exact' }).eq('status', 'disponible'),
        supabase.from('inventory_items').select('id', { count: 'exact' }).eq('status', 'en_verificacion'),
        supabase.from('dispatches').select('id', { count: 'exact' }).gte('dispatch_date', today),
        supabase.from('locations').select('id', { count: 'exact' }),
        supabase.from('inventory_items').select('serial_number, created_at, products(name)').eq('status', 'en_verificacion').order('created_at', { ascending: true }).limit(5)
      ]);

      return { availableItems, pendingVerificationItems, dispatchesToday, locationsCount, recentPendingItems };
    },
  });

  const stats = [
    {
      title: 'Items Disponibles',
      value: dashboardData?.availableItems ?? 0,
      change: 'Listos para despachar',
      changeType: 'positive' as const,
      icon: Package
    },
    {
      title: 'Pend. Verificación',
      value: dashboardData?.pendingVerificationItems ?? 0,
      change: 'Esperando ubicación',
      changeType: (dashboardData?.pendingVerificationItems ?? 0) > 0 ? 'neutral' as const : 'positive' as const,
      icon: CheckSquare
    },
    {
      title: 'Despachos de Hoy',
      value: dashboardData?.dispatchesToday ?? 0,
      change: `En la fecha de hoy`,
      changeType: 'positive' as const,
      icon: Truck
    },
    {
      title: 'Ubicaciones Totales',
      value: dashboardData?.locationsCount ?? 0,
      change: 'Coordenadas en almacén',
      changeType: 'neutral' as const,
      icon: MapPin
    }
  ];

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center space-x-4">
        <LayoutDashboard className="w-12 h-12 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard WMS</h1>
          <p className="text-muted-foreground">Resumen operativo de Logicarga</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            isLoading={isLoading}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>Items Más Antiguos Pendientes de Verificación</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData?.recentPendingItems && dashboardData.recentPendingItems.length > 0 ? (
              dashboardData.recentPendingItems.map((item) => (
                <div key={item.serial_number} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div>
                    <p className="font-mono text-sm font-semibold">{item.serial_number}</p>
                    <p className="text-xs text-muted-foreground">{item.products?.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Registrado {format(new Date(item.created_at), 'dd/MM/yyyy')}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No hay items pendientes de verificación.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { name: 'Verificar Ingreso', path: '/verificacion', color: 'bg-blue-600' },
              { name: 'Nuevo Despacho', path: '/despachos', color: 'bg-green-600' },
              { name: 'Ver Inventario', path: '/inventario', color: 'bg-purple-600' },
              { name: 'Gestionar Ubicaciones', path: '/ubicaciones', color: 'bg-orange-600' }
            ].map((action) => (
              <button
                key={action.name}
                className={`${action.color} text-white p-4 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity text-center`}
                onClick={() => handleQuickAction(action.path)}
              >
                {action.name}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
