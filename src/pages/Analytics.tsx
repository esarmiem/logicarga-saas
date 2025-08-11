import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/ui/stat-card';
import { Download, Package, Warehouse, Truck, AlertTriangle, Clock, Users, BarChart2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#3b82f6', '#84cc16', '#f97316', '#ef4444', '#6366f1', '#f59e0b'];

export function Analytics() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const pageRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['wms_analytics', selectedYear],
    queryFn: async () => {
      const startDate = startOfYear(new Date(selectedYear, 0, 1));
      const endDate = endOfYear(new Date(selectedYear, 11, 31));

      const [ 
        inventoryRes, 
        dispatchesRes, 
        locationsRes, 
        movementsRes 
      ] = await Promise.all([
        supabase.from('inventory_items').select('*, products(name, product_type, category)'),
        supabase.from('dispatches').select('*, customers(name)').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('locations').select('id', { count: 'exact' }),
        supabase.from('inventory_movements').select('*, inventory_items(serial_number, products(name)), locations_from:locations!inventory_movements_from_location_id_fkey(aisle, rack), locations_to:locations!inventory_movements_to_location_id_fkey(aisle, rack)').order('moved_at', { ascending: false }).limit(5)
      ]);

      if (inventoryRes.error) throw new Error(`Inventory Error: ${inventoryRes.error.message}`);
      if (dispatchesRes.error) throw new Error(`Dispatches Error: ${dispatchesRes.error.message}`);
      if (locationsRes.error) throw new Error(`Locations Error: ${locationsRes.error.message}`);
      if (movementsRes.error) throw new Error(`Movements Error: ${movementsRes.error.message}`);

      return {
        inventoryItems: inventoryRes.data || [],
        dispatches: dispatchesRes.data || [],
        totalLocations: locationsRes.count || 0,
        recentMovements: movementsRes.data || [],
      };
    }
  });

  const analyticsData = useMemo(() => {
    if (!data) return null;

    // KPIs
    const activeInventory = data.inventoryItems.filter(i => i.status !== 'despachado' && i.status !== 'dado_de_baja');
    const availableItems = activeInventory.filter(i => i.status === 'disponible').length;
    const pendingVerification = activeInventory.filter(i => i.status === 'en_verificacion').length;
    const dispatchesLast30Days = data.dispatches.filter(d => new Date(d.created_at) > subDays(new Date(), 30) && d.status === 'completado').length;
    const occupiedLocations = new Set(data.inventoryItems.map(i => i.location_id).filter(Boolean)).size;
    const warehouseCapacity = data.totalLocations > 0 ? Math.round((occupiedLocations / data.totalLocations) * 100) : 0;

    // Charts
    const inventoryByStatus = activeInventory.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const inventoryByProductType = activeInventory.reduce((acc, item) => {
      const type = item.products?.product_type || 'Desconocido';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const top5Products = Object.entries(activeInventory.filter(i => i.status === 'disponible').reduce((acc, item) => {
      const name = item.products?.name || 'Desconocido';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const agingInventory = activeInventory.filter(i => i.status === 'disponible').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 10);

    const months = eachMonthOfInterval({ start: startOfYear(new Date(selectedYear, 0, 1)), end: endOfYear(new Date(selectedYear, 11, 31)) });
    const dispatchesByMonth = months.map(month => ({
      name: format(month, 'MMM', { locale: es }),
      Completados: data.dispatches.filter(d => new Date(d.created_at).getMonth() === month.getMonth() && d.status === 'completado').length,
      Cancelados: data.dispatches.filter(d => new Date(d.created_at).getMonth() === month.getMonth() && d.status === 'cancelado').length,
    }));

    const top5Customers = Object.entries(data.dispatches.filter(d => d.status === 'completado').reduce((acc, dispatch) => {
      const customerName = dispatch.customers?.name || 'Cliente Anónimo';
      acc[customerName] = (acc[customerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      kpis: {
        totalInventory: activeInventory.length,
        availableItems,
        pendingVerification,
        dispatchesLast30Days,
        warehouseCapacity,
      },
      charts: {
        inventoryByStatus: Object.entries(inventoryByStatus).map(([name, value]) => ({ name, value })),
        inventoryByProductType: Object.entries(inventoryByProductType).map(([name, value]) => ({ name, value })),
        top5Products: top5Products.map(([name, value]) => ({ name, value })),
        dispatchesByMonth,
        top5Customers: top5Customers.map(([name, value]) => ({ name, value })),
      },
      tables: {
        agingInventory,
        recentMovements: data.recentMovements,
      }
    };
  }, [data, selectedYear]);

  const handleDownload = async () => {
    if (!pageRef.current) return;
    setIsDownloading(true);
    const originalBackgroundColor = pageRef.current.style.backgroundColor;
    pageRef.current.style.backgroundColor = 'white'; // Ensure background is not transparent

    try {
      const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`WMS_Analytics_${selectedYear}.pdf`);
    } catch (e) {
      console.error("Error generating PDF:", e);
    } finally {
      pageRef.current.style.backgroundColor = originalBackgroundColor;
      setIsDownloading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen">Cargando analíticas...</div>;
  if (error) return <div className="text-red-500 text-center p-8">Error al cargar analíticas: {error.message}</div>;
  if (!analyticsData) return <div className="text-center p-8">No hay datos disponibles para mostrar.</div>;

  const { kpis, charts, tables } = analyticsData;

  return (
    <div className="space-y-6" ref={pageRef}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <BarChart2 className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Dashboard de Analíticas WMS</h1>
              <p className="text-muted-foreground">Visión general de la operación del almacén.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleDownload} disabled={isDownloading} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Descargando...' : 'Exportar a PDF'}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Inventario Total" value={kpis.totalInventory} icon={Warehouse} />
          <StatCard title="Items Disponibles" value={kpis.availableItems} icon={Package} changeType="positive" />
          <StatCard title="Pend. Verificación" value={kpis.pendingVerification} icon={AlertTriangle} changeType="negative" />
          <StatCard title="Despachos (30d)" value={kpis.dispatchesLast30Days} icon={Truck} />
          <StatCard title="Ocupación Almacén" value={`${kpis.warehouseCapacity}%`} icon={Warehouse} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Despachos por Mes ({selectedYear})</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={charts.dispatchesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Completados" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="Cancelados" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top 5 Productos Disponibles</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={charts.top5Products} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Cantidad" fill="#3b82f6" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Inventario por Estado</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={charts.inventoryByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {charts.inventoryByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Inventario por Tipo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={charts.inventoryByProductType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {charts.inventoryByProductType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tablas */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center"><Clock className="w-5 h-5 mr-2"/>Inventario más Antiguo (Disponible)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N/S</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.agingInventory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.serial_number}</TableCell>
                      <TableCell>{item.products?.name || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center"><Users className="w-5 h-5 mr-2"/>Top 5 Clientes por Despachos</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={charts.top5Customers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Despachos" fill="#84cc16" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}