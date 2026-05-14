import { useEffect, useState } from 'react'
import { api } from '../api/api'
import type { DashboardStats } from '../types'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

import {
  DollarSign,
  ShoppingCart,
  Users,
  Clock3,
  Activity,
  ArrowUpRight,
} from 'lucide-react'

const Dashboard = () => {
  const [s, setS] = useState<DashboardStats | null>(null)

  useEffect(() => {
    void api.get<DashboardStats>('/reports/dashboard')
      .then((r) => setS(r.data))
  }, [])

  if (!s) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-slate-500">
        Loading dashboard...
      </div>
    )
  }

  const stats = [
    { title: 'Revenue', value: `₹${s.revenue}`, icon: DollarSign },
    { title: 'Orders', value: s.total_orders, icon: ShoppingCart },
    { title: 'Active Tables', value: s.active_tables, icon: Users },
    { title: 'Pending', value: s.pending_orders, icon: Clock3 },
  ]

  return (
    <div className="space-y-6 bg-white min-h-screen p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Restaurant overview
          </p>
        </div>

       
      </div>

      {/* STATS */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {stats.map((item, i) => {
          const Icon = item.icon

          return (
            <div
              key={i}
              className="p-5 rounded-2xl border border-orange-100 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                  {item.title}
                </p>

                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-orange-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mt-3 text-slate-900">
                {item.value}
              </h2>

              <div className="flex items-center gap-1 mt-3 text-orange-600 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                Live update
              </div>
            </div>
          )
        })}

      </div>

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* CHART */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-orange-100 bg-white">

          <div className="flex justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              Top Selling Items
            </h2>

            <Activity className="h-5 w-5 text-orange-500" />
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.top_items}>
                <CartesianGrid opacity={0.08} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">

          <div className="p-5 rounded-2xl border border-orange-100 bg-orange-50">
            <p className="text-sm text-slate-600">Total Revenue</p>

            <h2 className="text-3xl font-bold text-orange-600 mt-2">
              ₹{s.revenue}
            </h2>

            <div className="text-sm text-orange-600 mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" />
              Growth this month
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-orange-100 bg-white space-y-3">

            <div className="flex justify-between">
              <span className="text-slate-600">Kitchen Queue</span>
              <span className="font-bold">{s.pending_orders}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-600">Occupied Tables</span>
              <span className="font-bold">{s.active_tables}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-600">Total Orders</span>
              <span className="font-bold">{s.total_orders}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Dashboard