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

  const getOrderStatus = (order: Order) => {
  const allServed = order.items.every(i => i.status === 'served')
  const allReadyOrServed = order.items.every(
    i => i.status === 'ready' || i.status === 'served'
  )
  const anyPreparing = order.items.some(i => i.status === 'preparing')

  if (allServed) return 'served'
  if (allReadyOrServed) return 'ready'
  if (anyPreparing) return 'preparing'

  return 'pending'
}

  const bump = async (orderId: number, itemId: number, status: string) => {
    await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status })
    toast.success('Updated')
    load()
  }

  // Calculate order progress
  const getOrderProgress = (order: Order) => {
    const readyCount = order.items.filter(i => i.status === 'ready').length
    const servedCount = order.items.filter(i => i.status === 'served').length
    return { readyCount, servedCount, totalCount: order.items.length }
  }

  return (
    <div className="space-y-6">
      <audio ref={audio} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />
      <div>
        <h1 className="text-2xl font-semibold">Kitchen display</h1>
        <p className="text-sm opacity-70">Mark items preparing → ready. Waiters serve items independently when ready.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {orders.map((o) => {
          const status = getOrderStatus(o)
          const progress = getOrderProgress(o)
          const allReady = progress.readyCount === progress.totalCount && progress.servedCount === 0
          const partialReady = progress.readyCount > 0 && progress.readyCount < progress.totalCount
          
          return (
            <div
              key={o.id}
              className={`rounded-2xl border-2 p-4 space-y-3 ${
                allReady
                  ? 'border-green-400 bg-green-50/40 dark:bg-green-900/20'
                  : partialReady
                  ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/20'
                  : 'border-orange-400/40 bg-orange-50/40 dark:bg-slate-900/80'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">#{o.id}</span>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{status}</div>
                  <div className="text-sm font-semibold">
                    {progress.readyCount}/{progress.totalCount} Ready
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    allReady ? 'bg-green-500' : partialReady ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${(progress.readyCount / progress.totalCount) * 100}%`,
                  }}
                />
              </div>
              
              {o.items.map((li) => (
                <div
                  key={li.id}
                  className={`border rounded-lg p-3 space-y-2 transition-all ${
                    li.status === 'ready'
                      ? 'bg-green-100/60 dark:bg-green-900/30 border-green-400'
                      : li.status === 'served'
                      ? 'bg-gray-100/60 dark:bg-gray-800/30 border-gray-400'
                      : 'bg-white/50 dark:bg-slate-800/50 border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{li.menu_item_name}</div>
                      <div className="text-xs opacity-60">×{li.quantity}</div>
                      {li.special_instructions && (
                        <div className="text-xs text-red-600 font-semibold mt-2 bg-red-50 dark:bg-red-900/30 p-2 rounded">
                          🔔 {li.special_instructions}
                        </div>
                      )}
                    </div>
                    {li.status === 'ready' && (
                      <span className="text-xs px-2 py-1 bg-green-500 text-white rounded font-semibold">
                        ✓ READY
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {['preparing', 'ready', 'served'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`px-2 py-1 rounded-lg text-xs capitalize font-medium transition-all ${
                          li.status === s
                            ? s === 'ready'
                              ? 'bg-green-500 text-white'
                              : s === 'served'
                              ? 'bg-gray-600 text-white'
                              : 'bg-amber-600 text-white'
                            : 'bg-white/80 dark:bg-slate-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                        onClick={() => bump(o.id, li.id, s)}
                      >
                        {s === 'ready' ? '✓' : ''} {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Kitchen
