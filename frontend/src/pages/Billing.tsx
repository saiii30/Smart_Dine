import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { Order } from '../types'
import { Receipt, FileText } from 'lucide-react'

const Billing = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [sel, setSel] = useState<number | ''>('')

  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0.05)

  const load = () => {
    void api
      .get<Order[]>('/orders')
      .then((r) =>
        setOrders(r.data.filter((o) => o.status !== 'completed'))
      )
  }

  useEffect(() => {
    load()
  }, [])

  const order = orders.find((o) => o.id === sel)

  const total =
    order
      ? order.subtotal +
        order.subtotal * tax -
        discount
      : 0

  const finalize = async () => {
    if (!order) return

    await api.post(`/billing/orders/${order.id}/finalize`, {
      tax_rate: tax,
      discount_amount: discount,
      payments: [
        {
          amount: total,
          payment_method: 'CASH',
          split_label: 'FULL PAYMENT',
        },
      ],
    })

    toast.success('Payment completed')
    setSel('')
    load()
  }

  const pdf = async () => {
    if (!sel) return
    const res = await api.get(
      `/billing/orders/${sel}/invoice.pdf`,
      { responseType: 'blob' }
    )

    const url = URL.createObjectURL(res.data)
    window.open(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-slate-500">
          Simple checkout & invoice generation
        </p>
      </div>

      {/* ORDER SELECT */}
      <div className="p-4 border rounded-2xl bg-white dark:bg-slate-900">
        <label className="text-sm font-medium">
          Select Order
        </label>

        <select
          className="w-full mt-2 rounded-xl border px-3 py-2 bg-transparent"
          value={sel}
          onChange={(e) =>
            setSel(e.target.value ? Number(e.target.value) : '')
          }
        >
          <option value="">Choose order</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.table_name ? `Table ${o.table_name}` : 'Takeaway'} - #{o.id} — ₹{o.total_amount.toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* BILL SUMMARY */}
      {order && (
        <div className="p-6 border rounded-2xl bg-white dark:bg-slate-900 space-y-4">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <h2 className="font-semibold">Bill Summary</h2>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {order.table_name ? `Table ${order.table_name}` : 'Takeaway'} - Order #{order.id}
            </div>
          </div>

          <div className="space-y-2 text-sm">

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Tax ({tax * 100}%)</span>
              <span>₹{(order.subtotal * tax).toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Discount</span>
              <span>- ₹{discount}</span>
            </div>

            <hr />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>

          </div>

          {/* INPUTS */}
          <div className="grid sm:grid-cols-2 gap-4">

            <div>
              <label className="text-sm">Discount</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full mt-1 border rounded-xl px-3 py-2 bg-transparent"
              />
            </div>

            <div>
              <label className="text-sm">Tax Rate</label>
              <input
                type="number"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
                className="w-full mt-1 border rounded-xl px-3 py-2 bg-transparent"
              />
            </div>

          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 pt-2">

            <button
              onClick={finalize}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium"
            >
              Complete Payment
            </button>

            <button
              onClick={pdf}
              className="px-5 py-3 rounded-xl border flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Invoice
            </button>

          </div>

        </div>
      )}

    </div>
  )
}

export default Billing