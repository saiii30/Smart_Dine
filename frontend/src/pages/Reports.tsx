import { useEffect, useState } from 'react'
import { api } from '../api/api'
import type { DashboardStats } from '../types'

const Reports = () => {
  const [s, setS] = useState<DashboardStats | null>(null)

  useEffect(() => {
    void api.get<DashboardStats>('/reports/dashboard').then((r) => setS(r.data))
  }, [])

  const csv = async () => {
    const res = await api.get('/reports/export/orders.csv', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orders.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      {s && (
        <div className="rounded-2xl border border-amber-100 dark:border-slate-800 p-5 bg-white/90 dark:bg-slate-900/70 text-sm space-y-2">
          <div>30-day revenue (payments): ₹{s.revenue.toFixed(2)}</div>
          <div>All-time orders recorded: {s.total_orders}</div>
        </div>
      )}
      <button type="button" onClick={csv} className="px-4 py-2 rounded-xl border text-sm">
        Export orders CSV
      </button>
      <p className="text-xs opacity-60">
        CSV export uses your session cookie/token in the same browser session when opened from the app while logged in;
        prefer wiring a download blob with axios for production.
      </p>
    </div>
  )
}

export default Reports
