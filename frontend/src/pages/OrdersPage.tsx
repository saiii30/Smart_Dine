import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable, MenuItem, Order } from '../types'
import { useOrderSocket } from '../hooks/useOrderSocket'
import { ShoppingBag, Clock, CheckCircle, ChefHat } from 'lucide-react'

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  served: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-200 text-gray-700',
}

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [open, setOpen] = useState(false)

  const [tableId, setTableId] = useState<number | ''>('')
  const [cart, setCart] = useState<{ menu_item_id: number; quantity: number }[]>([])

  const load = () => {
    void api.get<Order[]>('/orders').then((r) => setOrders(r.data))
  }

  useEffect(() => {
    load()
    void api.get('/tables').then((r) => setTables(r.data))
    void api.get('/menu-items').then((r) => setMenu(r.data))
  }, [])

  useOrderSocket(() => {
    load()
    toast('Live update 🔔')
  })

  const submit = async () => {
    if (!tableId || !cart.length) {
      toast.error('Select table & items')
      return
    }

    await api.post('/orders', {
      table_id: tableId,
      items: cart,
    })

    toast.success('Order placed')
    setOpen(false)
    setCart([])
    load()
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-slate-500">Real-time kitchen operations</p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-black text-white flex items-center gap-2"
        >
          <ShoppingBag className="h-4 w-4" />
          New Order
        </button>
      </div>

      {/* ORDERS GRID */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {orders.map((o) => (
          <div
            key={o.id}
            className="rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition"
          >

            {/* HEADER */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">
                  Order #{o.id}
                </h2>
                <p className="text-xs text-slate-500">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Live order
                </p>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full ${statusColor[o.status]}`}>
                {o.status}
              </span>
            </div>

            {/* ITEMS */}
            <div className="mt-4 space-y-1 text-sm">
              {o.items.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span>{i.menu_item_name}</span>
                  <span className="text-slate-500">x{i.quantity}</span>
                </div>
              ))}
            </div>

            {/* FOOTER */}
            <div className="mt-4 flex justify-between items-center">
              <div className="font-bold text-lg">
                ₹{o.total_amount.toFixed(2)}
              </div>

              <select
                className="text-xs border rounded-lg px-2 py-1"
                value={o.status}
                onChange={async (e) => {
                  await api.patch(`/orders/${o.id}/status`, null, {
                    params: { status: e.target.value },
                  })
                  toast.success('Updated')
                  load()
                }}
              >
                {['pending', 'preparing', 'ready', 'served', 'completed'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {!orders.length && (
        <div className="text-center py-20 border rounded-2xl">
          <ChefHat className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-slate-500">No orders yet</p>
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 space-y-4">

            <h2 className="text-lg font-semibold">Create Order</h2>

            <select
              className="w-full border rounded-xl p-2"
              value={tableId}
              onChange={(e) =>
                setTableId(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option>Select table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.table_number}
                </option>
              ))}
            </select>

            <div className="max-h-60 overflow-auto space-y-2">
              {menu
                .filter((m) => m.is_available)
                .map((m) => {
                  const line = cart.find(
                    (c) => c.menu_item_id === m.id
                  )

                  return (
                    <div
                      key={m.id}
                      className="flex justify-between items-center"
                    >
                      <span>
                        {m.name} ₹{m.price}
                      </span>

                      <input
                        type="number"
                        className="w-16 border rounded px-1"
                        value={line?.quantity || 0}
                        onChange={(e) => {
                          const q = Number(e.target.value)
                          setCart((prev) => {
                            const rest = prev.filter(
                              (x) => x.menu_item_id !== m.id
                            )
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
              onClick={submit}
              className="w-full bg-black text-white py-3 rounded-xl"
            >
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersPage