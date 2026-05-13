import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { Order } from '../types'
import { useOrderSocket } from '../hooks/useOrderSocket'

const Kitchen = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const audio = useRef<HTMLAudioElement | null>(null)

  const load = useCallback(() => {
    void api.get<Order[]>('/kitchen/orders').then((r) => setOrders(r.data))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useOrderSocket((msg: { event?: string; order_id?: number }) => {
    if (msg.event === 'order_created') {
      try {
        void audio.current?.play()
      } catch {
        /* autoplay blocked */
      }
      toast.success('New order for kitchen')
    }
    load()
  })

  const bump = async (orderId: number, itemId: number, status: string) => {
    await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status })
    toast.success('Updated')
    load()
  }

  return (
    <div className="space-y-6">
      <audio ref={audio} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />
      <div>
        <h1 className="text-2xl font-semibold">Kitchen display</h1>
        <p className="text-sm opacity-70">Mark items preparing → ready for runners.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {orders.map((o) => (
          <div
            key={o.id}
            className="rounded-2xl border-2 border-orange-400/40 bg-orange-50/40 dark:bg-slate-900/80 p-4 space-y-3"
          >
            <div className="flex justify-between">
              <span className="font-bold text-lg">#{o.id}</span>
              <span className="text-xs uppercase tracking-wide opacity-70">{o.status}</span>
            </div>
            {o.items.map((li) => (
              <div key={li.id} className="flex justify-between items-center text-sm gap-2">
                <div>
                  <div className="font-medium">{li.menu_item_name}</div>
                  <div className="text-xs opacity-60">×{li.quantity}</div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['preparing', 'ready', 'served'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`px-2 py-1 rounded-lg text-xs capitalize ${
                        li.status === s ? 'bg-amber-600 text-white' : 'bg-white/80 dark:bg-slate-800'
                      }`}
                      onClick={() => bump(o.id, li.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Kitchen
