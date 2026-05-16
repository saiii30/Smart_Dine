import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'

interface InvRow {
  id: number
  name: string
  quantity: number
  unit: string
  reorder_level: number
  is_low_stock: boolean
}

const Inventory = () => {
  const [rows, setRows] = useState<InvRow[]>([])

  const load = () => void api.get<InvRow[]>('/inventory').then((r) => setRows(r.data))

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm opacity-70">Stock levels and low-stock signals.</p>
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm w-full sm:w-auto"
          onClick={async () => {
            const name = window.prompt('Ingredient name')
            if (!name) return
            await api.post('/inventory', { name, quantity: 10, unit: 'kg', reorder_level: 5 })
            toast.success('Added')
            load()
          }}
        >
          Add item
        </button>
      </div>
      <div className="rounded-2xl border border-amber-100 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100/80 dark:bg-slate-800/80">
            <tr>
              <th className="text-left p-3">Item</th>
              <th className="text-left p-3">Qty</th>
              <th className="text-left p-3">Reorder</th>
              <th className="text-left p-3">Alert</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3">{r.name}</td>
                <td className="p-3">
                  {r.quantity} {r.unit}
                </td>
                <td className="p-3">{r.reorder_level}</td>
                <td className="p-3">
                  {r.is_low_stock ? <span className="text-red-600 font-medium">Low</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Inventory
