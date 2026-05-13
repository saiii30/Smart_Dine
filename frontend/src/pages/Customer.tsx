import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable, MenuItem, Order } from '../types'

const Customer = () => {
  const { token } = useParams()
  const [table, setTable] = useState<DiningTable | null>(null)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<{ menu_item_id: number; quantity: number }[]>([])
  const [track, setTrack] = useState<Order | null>(null)

  useEffect(() => {
    if (!token) return
    void api.get<DiningTable>(`/public/tables/${token}`).then((r) => setTable(r.data))
    void api.get<MenuItem[]>('/public/menu').then((r) => setMenu(r.data))
  }, [token])

  const submit = async () => {
    if (!token || !cart.length) {
      toast.error('Add items')
      return
    }
    const res = await api.post<Order>(`/public/tables/${token}/orders`, { items: cart })
    setTrack(res.data)
    setCart([])
    toast.success('Order sent to kitchen')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-slate-950 dark:to-slate-900 px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-amber-800 dark:text-amber-200">Smart Dine</h1>
          {table && <p className="text-sm opacity-70">You are at table {table.table_number}</p>}
        </header>
        <div className="space-y-3">
          {menu.map((m) => {
            const line = cart.find((c) => c.menu_item_id === m.id)
            return (
              <div
                key={m.id}
                className="flex justify-between items-center rounded-2xl border border-amber-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs opacity-60">₹{m.price}</div>
                </div>
                <input
                  type="number"
                  min={0}
                  className="w-16 rounded-lg border px-2 py-1 bg-transparent"
                  value={line?.quantity || 0}
                  onChange={(e) => {
                    const q = Number(e.target.value)
                    setCart((prev) => {
                      const rest = prev.filter((x) => x.menu_item_id !== m.id)
                      if (!q) return rest
                      return [...rest, { menu_item_id: m.id, quantity: q }]
                    })
                  }}
                />
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={submit}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg"
        >
          Place order
        </button>
        {track && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/40 p-4 text-sm">
            <div className="font-semibold mb-1">Live tracking</div>
            <div>Order #{track.id}</div>
            <div className="capitalize">Status: {track.status}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Customer
