import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/api'
import type { Order } from '../types'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import {
  Download,
  TrendingUp,
  Calendar,
  Clock,
  UtensilsCrossed,
  IndianRupee
} from 'lucide-react'

const Reports = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void api.get<Order[]>('/orders').then((r) => {
      setOrders(r.data)
      setLoading(false)
    })
  }, [])

  // Data Processing for Charts
  const { 
    dailyData, 
    monthlyData, 
    hourlyData, 
    topItemsData, 
    totalSales, 
    bestItem 
  } = useMemo(() => {
    const validOrders = orders.filter(o => ['served', 'completed'].includes(o.status));

    const daily: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const hourly: Record<string, number> = {};
    const items: Record<string, number> = {};
    let total = 0;

    validOrders.forEach(o => {
      total += o.total_amount;
      // Use created_at if available, else fallback to current date (for mock data)
      const dt = o.created_at ? new Date(o.created_at + 'Z') : new Date();

      // Daily Aggregation
      const dKey = dt.toISOString().split('T')[0];
      daily[dKey] = (daily[dKey] || 0) + o.total_amount;

      // Monthly Aggregation
      const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      monthly[mKey] = (monthly[mKey] || 0) + o.total_amount;

      // Hourly Aggregation
      const hKey = dt.getHours();
      hourly[hKey] = (hourly[hKey] || 0) + o.total_amount;

      // Items Aggregation
      o.items.forEach(i => {
        if (i.status !== 'cancelled') {
          const name = i.menu_item_name || 'Unknown Item';
          items[name] = (items[name] || 0) + i.quantity;
        }
      });
    });

    // Format Daily (Last 14 days)
    const dailyData = Object.keys(daily).sort().slice(-14).map(k => ({
      date: new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Sales: Math.round(daily[k])
    }));

    // Format Monthly
    const monthlyData = Object.keys(monthly).sort().map(k => {
      const [y, m] = k.split('-');
      const date = new Date(Number(y), Number(m) - 1);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        Sales: Math.round(monthly[k])
      };
    });

    // Format Hourly
    const hourlyData = Object.keys(hourly).sort((a, b) => Number(a) - Number(b)).map(k => {
      const h = Number(k);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr12 = h % 12 || 12;
      return {
        time: `${hr12} ${ampm}`,
        Sales: Math.round(hourly[k])
      };
    });

    // Format Top Items
    const topItemsData = Object.keys(items).map(k => ({
      name: k,
      Quantity: items[k]
    })).sort((a, b) => b.Quantity - a.Quantity).slice(0, 8); // Top 8 items

    const bestItem = topItemsData.length > 0 ? topItemsData[0].name : 'N/A';

    return { dailyData, monthlyData, hourlyData, topItemsData, totalSales: total, bestItem };
  }, [orders]);

  // Generic Local Export Function for Individual Charts
  const exportChartData = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const csv = async () => {
    try {
      const res = await api.get('/reports/export/orders.csv', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `SmartDine_Orders_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      // Fallback if endpoint is unavailable
      alert('Export feature is being configured.')
    }
  }

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center text-slate-500">Loading Reports...</div>
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Detailed breakdown of sales and performance.</p>
        </div>
        {/* <button 
          onClick={csv} 
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors self-start md:self-auto"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button> */}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><IndianRupee className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
            <p className="text-2xl font-black mt-1">₹{totalSales.toFixed(0)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Completed Orders</p>
            <p className="text-2xl font-black mt-1">{orders.filter(o => ['completed', 'served'].includes(o.status)).length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center"><UtensilsCrossed className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Top Selling Item</p>
            <p className="text-lg font-black mt-1 line-clamp-1">{bestItem}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center"><Calendar className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Active Days</p>
            <p className="text-2xl font-black mt-1">{dailyData.length}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Daily Sales Trend (Last 14 Days)</h2>
            <button onClick={() => exportChartData(dailyData, 'Daily_Sales')} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors" title="Export Daily Sales">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Sales Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /> Monthly Revenue</h2>
            <button onClick={() => exportChartData(monthlyData, 'Monthly_Revenue')} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors" title="Export Monthly Revenue">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="month" tick={{fontSize: 12}} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="Sales" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Sales Hours Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-purple-500" /> Peak Sales Hours</h2>
            <button onClick={() => exportChartData(hourlyData, 'Peak_Sales_Hours')} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors" title="Export Hourly Sales">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="time" tick={{fontSize: 12}} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12}} tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                <Line type="monotone" dataKey="Sales" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-orange-500" /> Fast Moving Items</h2>
            <button onClick={() => exportChartData(topItemsData, 'Top_Selling_Items')} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors" title="Export Top Items">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItemsData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                <XAxis type="number" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="Quantity" fill="#f97316" radius={[0, 6, 6, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Reports
