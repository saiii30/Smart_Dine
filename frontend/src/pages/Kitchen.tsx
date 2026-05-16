import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { Order } from '../types'
import { useOrderSocket } from '../hooks/useOrderSocket'
import { Clock, ChefHat } from 'lucide-react'

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  served: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

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

  const getOrderStatus = (items: Order['items']) => {
    const allServed = items.every(i => i.status === 'served')
    const allReadyOrServed = items.every(
      i => i.status === 'ready' || i.status === 'served'
    )
    const anyPreparing = items.some(i => i.status === 'preparing')

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
  const getOrderProgress = (items: Order['items']) => {
    const readyCount = items.filter(i => i.status === 'ready').length
    const servedCount = items.filter(i => i.status === 'served').length
    return { readyCount, servedCount, totalCount: items.length }
  }

  return (
    <div className="space-y-6 pb-24">
      <audio ref={audio} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />
      
      {/* App-like Sticky Header */}
      <div className="sticky top-0 z-30 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 sm:mx-0 sm:px-0 py-4 shadow-sm flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            KDS <span className="text-xl">👨‍🍳</span>
          </h1>
          <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Live Kitchen Display</p>
        </div>
        <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-4 py-2 rounded-xl text-sm font-black shadow-sm border border-amber-200 dark:border-amber-800/50">
          {orders.length} ACTIVE
        </div>
      </div>

      {/* Tablet/Phone Optimized Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {orders.map((o) => {
          const visibleItems = o.items.filter((li) => li.status !== 'cancelled')
          if (!visibleItems.length) return null
          const status = getOrderStatus(visibleItems)
          const progress = getOrderProgress(visibleItems)
          const allReady = progress.readyCount === progress.totalCount && progress.servedCount === 0
          const partialReady = progress.readyCount > 0 && progress.readyCount < progress.totalCount
          const allServed = progress.servedCount === progress.totalCount
          
          return (
            <div
              key={o.id}
              className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
                allServed
                  ? 'border-gray-300 bg-gray-50 dark:bg-gray-900/30'
                  : allReady
                  ? 'border-green-400 bg-green-50/40 dark:bg-green-900/20'
                  : partialReady
                  ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/20'
                  : 'border-yellow-300 bg-white dark:bg-slate-900'
              }`}
            >
              {/* Ticket Header */}
                <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-bold text-lg">
                    Order #{o.id}
                  </h2>
                    {o.customer_name && (
                      <div className="text-lg font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                        {o.customer_name}
                      </div>
                    )}
                  {/* <p className="text-xs text-slate-500">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {progress.readyCount}/{progress.totalCount} Ready
                  </p> */}
                </div>

                <div className="text-right">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColor[status]}`}>
                    {status}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-300 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all ${
                    allServed
                      ? 'bg-gray-500'
                      : allReady
                      ? 'bg-green-500'
                      : partialReady
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{
                    width: `${((progress.readyCount + progress.servedCount) / progress.totalCount) * 100}%`,
                  }}
                />
              </div>
              
              {/* ITEMS */}
              <div className="space-y-2 text-sm">
                {visibleItems.map((li) => (
                  <div
                    key={li.id}
                    className={`border rounded-lg p-2 space-y-2 transition-all ${
                      li.status === 'served'
                        ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-400'
                        : li.status === 'ready'
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-400'
                        : li.status === 'preparing'
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400'
                        : 'bg-white/50 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium">{li.menu_item_name}</div>
                        <div className="text-xs opacity-60">×{li.quantity}</div>
                        {li.special_instructions && (
                          <p className="text-xs text-slate-600 italic mt-1">
                            Note: {li.special_instructions}
                          </p>
                        )}
                      </div>
                      {li.status === 'ready' && (
                        <span className="text-xs px-2 py-1 bg-green-500 text-white rounded font-semibold">
                          ✓ READY
                        </span>
                      )}
                      {li.status === 'served' && (
                        <span className="text-xs px-2 py-1 bg-gray-600 text-white rounded font-semibold">
                          ✓ SERVED
                        </span>
                      )}
                    </div>
                    
                    {/* Item status buttons */}
                    <div className="flex gap-1 flex-wrap">
                      {['preparing', 'ready', 'served'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`px-2 py-1 rounded text-xs capitalize font-medium transition-all ${
                            li.status === s
                              ? s === 'ready'
                                ? 'bg-green-500 text-white'
                                : s === 'served'
                                ? 'bg-gray-600 text-white'
                                : 'bg-blue-500 text-white'
                              : 'bg-white/80 dark:bg-slate-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          onClick={() => bump(o.id, li.id, s)}
                        >
                          {s === 'ready' || s === 'served' ? '✓' : ''} {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER */}
              <div className="mt-4 flex justify-between items-center gap-2">
                <div>
                  {o.table_name && o.seat_count && (
                    <div className="text-xs text-slate-500">
                      Table {o.table_name} • {o.seat_count} seat{o.seat_count > 1 ? 's' : ''}
                      {o.customer_name && ` • ${o.customer_name}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* EMPTY STATE */}
      {!orders.length && (
        <div className="text-center py-20 border rounded-2xl bg-white dark:bg-slate-900">
          <ChefHat className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-slate-500">
            No active kitchen orders
          </p>
        </div>
      )}
    </div>
  )
}

export default Kitchen
