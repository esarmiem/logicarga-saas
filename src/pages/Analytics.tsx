
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, Users, Package, DollarSign, ShoppingCart, TrendingDown, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area } from 'recharts';
import { formatColombianPeso } from '@/lib/currency';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export function Analytics() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (type: 'pdf' | 'png') => {
    if (!contentRef.current) return;
    setDownloading(true);
    try {
      // Oculta los botones antes de capturar
      const buttons = contentRef.current.querySelectorAll('.no-export');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');
      const canvas = await html2canvas(contentRef.current, { scale: 2 });
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');
      if (type === 'png') {
        const link = document.createElement('a');
        link.download = `ganancias-mensuales-${selectedYear}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`ganancias-mensuales-${selectedYear}.pdf`);
      }
    } finally {
      setDownloading(false);
    }
  };

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['wms_analytics', selectedYear],
    queryFn: async () => {
      const currentMonthStart = format(new Date().setDate(1), 'yyyy-MM-dd');
      const currentMonthEnd = format(new Date(), 'yyyy-MM-dd');

      const [
        dispatchesResult,
        productsResult, 
        customersResult,
        expensesResult,
        currentMonthDispatchesResult,
        currentMonthExpensesResult
      ] = await Promise.all([
        supabase
          .from('dispatches')
          .select(`
            id,
            dispatch_date,
            status,
            created_at
          `)
          .gte('dispatch_date', `${selectedYear}-01-01`)
          .lte('dispatch_date', `${selectedYear}-12-31`),
        supabase.from('products').select('category, name, sku'),
        supabase.from('customers').select('customer_type, total_purchases'),
        supabase.from('expenses').select('amount, category, expense_date')
          .gte('expense_date', `${selectedYear}-01-01`)
          .lte('expense_date', `${selectedYear}-12-31`),
        // Current month dispatches
        supabase
          .from('dispatches')
          .select(`
            id,
            dispatch_date,
            status,
            created_at
          `)
          .gte('dispatch_date', currentMonthStart)
          .lte('dispatch_date', currentMonthEnd),
        // Current month expenses
        supabase.from('expenses').select('amount, category, expense_date')
          .gte('expense_date', currentMonthStart)
          .lte('expense_date', currentMonthEnd)
      ]);

      if (dispatchesResult.error) throw dispatchesResult.error;
      if (productsResult.error) throw productsResult.error;
      if (customersResult.error) throw customersResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (currentMonthDispatchesResult.error) throw currentMonthDispatchesResult.error;
      if (currentMonthExpensesResult.error) throw currentMonthExpensesResult.error;

      const dispatches = dispatchesResult.data || [];
      const products = productsResult.data || [];
      const customers = customersResult.data || [];
      const expenses = expensesResult.data || [];
      const currentMonthDispatches = currentMonthDispatchesResult.data || [];
      const currentMonthExpenses = currentMonthExpensesResult.data || [];

      // Estadísticas del mes actual
      const currentMonthTotalDispatches = currentMonthDispatches.length;
      const currentMonthCompletedDispatches = currentMonthDispatches.filter(d => d.status === 'completado').length;
      const currentMonthTotalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      // Estadísticas del año
      const totalDispatches = dispatches.length;
      const completedDispatches = dispatches.filter(d => d.status === 'completado').length;
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalProducts = products.length;
      const totalCustomers = customers.length;

      // Dispatches por mes para el año seleccionado
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      const dispatchesByMonth = months.map((month, index) => {
        const monthDispatches = dispatches.filter(d => {
          const date = new Date(d.dispatch_date || d.created_at);
          return date.getMonth() === index;
        });
        return {
          month,
          count: monthDispatches.length,
          completed: monthDispatches.filter(d => d.status === 'completado').length
        };
      });

      // Gastos por mes para el año seleccionado
      const expensesByMonth = months.map((month, index) => {
        const monthExpenses = expenses.filter(e => {
          const date = new Date(e.expense_date);
          return date.getMonth() === index;
        });
        return {
          month,
          amount: monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        };
      });

      // Gastos por categoría
      const expensesByCategory = expenses.reduce((acc: Record<string, number>, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {});

      // Productos por categoría
      const productsByCategory = products.reduce((acc: Record<string, number>, product) => {
        if (product.category) {
          acc[product.category] = (acc[product.category] || 0) + 1;
        }
        return acc;
      }, {});

      // Clientes por tipo
      const customersByType = customers.reduce((acc: Record<string, number>, customer) => {
        if (customer.customer_type) {
          acc[customer.customer_type] = (acc[customer.customer_type] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        currentMonthTotalDispatches,
        currentMonthCompletedDispatches,
        currentMonthTotalExpenses,
        totalDispatches,
        completedDispatches,
        totalExpenses,
        totalProducts,
        totalCustomers,
        dispatchesByMonth,
        expensesByMonth,
        expensesByCategory,
        productsByCategory,
        customersByType
      };
    },
  });

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando analytics...</div>;
  }

  if (!dashboardData) {
    return <div className="flex justify-center items-center h-64">Error al cargar los datos</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <TrendingUp className="w-12 h-12 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Analíticas</h1>
          </div>
        </div>
        <Calendar className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatColombianPeso(dashboardData.totalDispatches * 10000)}</div>
            <p className="text-xs text-muted-foreground">
              Ganancia neta: {formatColombianPeso(dashboardData.totalDispatches * 10000 - dashboardData.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatColombianPeso(dashboardData.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Descuentos: {formatColombianPeso(dashboardData.totalDispatches * 10000 - dashboardData.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Bruta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatColombianPeso(dashboardData.totalDispatches * 10000 - dashboardData.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.totalProducts} productos en inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Operativos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatColombianPeso(dashboardData.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.totalCustomers} clientes registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs del Mes Actual */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-bold">KPIs del Mes Actual - {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatColombianPeso(dashboardData.currentMonthTotalDispatches * 10000)}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.currentMonthTotalDispatches} ventas realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Costos del Mes</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatColombianPeso(dashboardData.currentMonthTotalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                Margen: {dashboardData.currentMonthTotalDispatches > 0 ? 
                  Math.round(((dashboardData.currentMonthTotalDispatches * 10000 - dashboardData.currentMonthTotalExpenses) / (dashboardData.currentMonthTotalDispatches * 10000)) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia del Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatColombianPeso(dashboardData.currentMonthTotalDispatches * 10000 - dashboardData.currentMonthTotalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                Gastos: {formatColombianPeso(dashboardData.currentMonthTotalExpenses)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia Neta Mensual</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboardData.currentMonthTotalDispatches * 10000 - dashboardData.currentMonthTotalExpenses >= 0 ? 'text-primary' : 'text-primary'}`}>
                {formatColombianPeso(dashboardData.currentMonthTotalDispatches * 10000 - dashboardData.currentMonthTotalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.currentMonthTotalDispatches * 10000 - dashboardData.currentMonthTotalExpenses >= 0 ? 'Rentable' : 'En pérdida'} este mes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Análisis de Ganancias Mensuales */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Ganancias</CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <label className="text-sm font-medium">Año</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-24 sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 6 }, (_, i) => 2025 - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownload('png')}
                disabled={downloading}
                className="no-export text-xs sm:text-sm"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Exportar como PNG</span>
                <span className="sm:hidden">PNG</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownload('pdf')}
                disabled={downloading}
                className="no-export text-xs sm:text-sm"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Exportar como PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={contentRef} className="p-4">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Ganancias Mensuales</h3>
              <div className="text-3xl font-bold text-primary mb-1">
                {formatColombianPeso(dashboardData.totalDispatches * 10000)}
              </div>
              <p className="text-sm">
                Este Año +{Math.round(((dashboardData.totalDispatches * 10000) / 
                  (dashboardData.totalDispatches * 10000)) * 100)}%
              </p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dashboardData.dispatchesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value, 
                    name === 'count' ? 'Ventas' : 'Ventas Completadas'
                  ]} 
                />
                <Bar dataKey="count" fill="#3b82f6" name="Ventas" />
                <Bar dataKey="completed" fill="#22c55e" name="Ventas Completadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de Ganancia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ganancia por Mes</CardTitle>
            <p className="text-sm text-muted-foreground">Ventas vs Ventas Completadas</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={dashboardData.dispatchesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value, 
                    name === 'count' ? 'Ventas' : 'Ventas Completadas'
                  ]} 
                />
                <Bar dataKey="count" fill="#3b82f6" name="Ventas" />
                <Bar dataKey="completed" fill="#22c55e" name="Ventas Completadas" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Mes</CardTitle>
            <p className="text-sm text-muted-foreground">Gastos por Mes</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.expensesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatColombianPeso(Number(value)), 'Gastos']} />
                <Bar dataKey="amount" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(dashboardData.productsByCategory).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(dashboardData.productsByCategory).map(([name, value], index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(dashboardData.expensesByCategory).map(([name, value]) => ({ name, value }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [formatColombianPeso(Number(value)), 'Gastos']} />
                <Bar dataKey="value" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(dashboardData.customersByType).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#ffc658"
                  dataKey="value"
                >
                  {Object.entries(dashboardData.customersByType).map(([name, value], index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
