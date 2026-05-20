import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { Order } from '../types'
import {
  Receipt,
  FileText,
  IndianRupee,
  ShoppingBag,
  CreditCard,
} from 'lucide-react'

const Billing = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [sel, setSel] = useState<number | ''>('')

  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0.05)

  const load = () => {
    void api
      .get<Order[]>('/orders')
      .then((r) =>
        setOrders(
          r.data.filter(
            (o) => o.status === 'served'
          )
        )
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

    try {
      await api.post(
        `/billing/orders/${order.id}/finalize`,
        {
          tax_rate: tax,
          discount_amount: discount,
          payments: [
            {
              amount: total,
              payment_method: 'CASH',
              split_label: 'FULL PAYMENT',
            },
          ],
        }
      )

      toast.success('Payment completed')

      setSel('')
      load()
    } catch {
      toast.error('Payment failed')
    }
  }

  const pdf = async () => {
    if (!sel) return

    try {
      const res = await api.get(
        `/billing/orders/${sel}/invoice.pdf`,
        { responseType: 'blob' }
      )

      const url = URL.createObjectURL(res.data)

      window.open(url)
    } catch {
      toast.error('Failed to generate invoice')
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Billing
          </h1>

          <p className="text-slate-500 mt-1">
            Manage restaurant payments & invoices
          </p>
        </div>

        <div className="hidden md:flex items-center gap-3">

          <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-emerald-600" />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Pending Revenue
            </p>

            <h2 className="text-2xl font-black">
              ₹
              {orders
                .reduce(
                  (acc, o) => acc + o.total_amount,
                  0
                )
                .toFixed(0)}
            </h2>
          </div>

        </div>

      </div>

      {/* STATS */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Active Bills
              </p>

              <h2 className="text-3xl font-black mt-2">
                {orders.length}
              </h2>
            </div>

            <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Pending Revenue
              </p>

              <h2 className="text-3xl font-black mt-2">
                ₹
                {orders
                  .reduce(
                    (acc, o) =>
                      acc + o.total_amount,
                    0
                  )
                  .toFixed(0)}
              </h2>
            </div>

            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Avg Bill
              </p>

              <h2 className="text-3xl font-black mt-2">
                ₹
                {orders.length
                  ? (
                      orders.reduce(
                        (acc, o) =>
                          acc + o.total_amount,
                        0
                      ) / orders.length
                    ).toFixed(0)
                  : 0}
              </h2>
            </div>

            <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Selected Order
              </p>

              <h2 className="text-3xl font-black mt-2">
                {order ? `#${order.id}` : '--'}
              </h2>
            </div>

            <div className="h-12 w-12 rounded-2xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

      </div>

      {/* ORDER SELECT */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">

        <label className="text-sm font-semibold">
          Select Order
        </label>

        <select
          className="w-full mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
          value={sel}
          onChange={(e) =>
            setSel(
              e.target.value
                ? Number(e.target.value)
                : ''
            )
          }
        >
          <option value="">
            Choose order
          </option>

          {orders.map((o) => (
            <option
              key={o.id}
              value={o.id}
            >
              {o.table_name
                ? `Table ${o.table_name}`
                : 'Takeaway'}{' '}
              - #{o.id}{' '}
              {o.customer_name
                ? `(${o.customer_name})`
                : ''}{' '}
              — ₹
              {o.total_amount.toFixed(2)}
            </option>
          ))}

        </select>

      </div>

      {/* QUICK ORDER CARDS */}
      {orders.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">

          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSel(o.id)}
              className={`text-left p-5 rounded-3xl border transition-all duration-200 ${
                sel === o.id
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md'
              }`}
            >

              <div className="flex items-start justify-between">

                <div>
                  <h3 className="font-bold text-lg">
                    {o.table_name
                      ? `Table ${o.table_name}`
                      : 'Takeaway'}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Order #{o.id}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black">
                    ₹
                    {o.total_amount.toFixed(0)}
                  </div>
                </div>

              </div>

              {o.customer_name && (
                <div className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {o.customer_name}
                </div>
              )}

            </button>
          ))}

        </div>
      )}

      {/* EMPTY STATE */}
      {orders.length === 0 && (
        <div className="p-16 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center bg-white dark:bg-slate-900">

          <Receipt className="h-14 w-14 mx-auto text-slate-300" />

          <h2 className="mt-5 text-2xl font-black">
            No Pending Bills
          </h2>

          <p className="text-slate-500 mt-2">
            All orders are completed or no active orders available.
          </p>

        </div>
      )}

      {/* BILL SUMMARY */}
      {order && (
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Bill Summary
                </h2>

                <p className="text-sm text-slate-500">
                  Review payment details
                </p>
              </div>

            </div>

            <div className="text-right">

              <div className="text-sm text-slate-500">
                {order.table_name
                  ? `Table ${order.table_name}`
                  : 'Takeaway'}{' '}
                - Order #{order.id}
              </div>

              {order.customer_name && (
                <div className="text-lg font-bold mt-1">
                  {order.customer_name}
                </div>
              )}

            </div>

          </div>

          {/* TOTALS */}
          <div className="space-y-3 text-sm">

            <div className="flex justify-between">
              <span>Subtotal</span>

              <span>
                ₹{order.subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>
                Tax ({tax * 100}%)
              </span>

              <span>
                ₹
                {(order.subtotal * tax).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Discount</span>

              <span>
                - ₹{discount.toFixed(2)}
              </span>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            <div className="flex justify-between text-2xl font-black">
              <span>Total</span>

              <span>
                ₹{total.toFixed(2)}
              </span>
            </div>

          </div>

          {/* INPUTS */}
          <div className="grid sm:grid-cols-2 gap-4">

            <div>
              <label className="text-sm font-semibold">
                Discount
              </label>

              <input
                type="number"
                value={discount}
                onChange={(e) =>
                  setDiscount(
                    Number(e.target.value)
                  )
                }
                className="w-full mt-2 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Tax Rate
              </label>

              <input
                type="number"
                step="0.01"
                value={tax}
                onChange={(e) =>
                  setTax(
                    Number(e.target.value)
                  )
                }
                className="w-full mt-2 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">

            <button
              onClick={finalize}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all"
            >
              Complete Payment
            </button>

            <button
              onClick={pdf}
              className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
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