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
      <div className="sticky top-0 z-30 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 sm:mx-0 sm:px-0 py-4 shadow-sm flex justify-between items-center">
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
          
          return (
            <div
              key={o.id}
              className={`rounded-2xl border-2 p-4 sm:p-5 space-y-4 shadow-lg ${
                allReady
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                  : partialReady
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              {/* Ticket Header */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <span className="font-black text-2xl text-slate-800 dark:text-white leading-none">#{o.id}</span>
                  {o.table_name && <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">{o.table_name}</div>}
                </div>
                <div className="text-right">
                  <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md inline-block mb-1 ${status === 'pending' ? 'bg-slate-200 text-slate-600' : status === 'preparing' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>{status}</div>
                  <div className="text-xs font-bold text-slate-500">
                    {progress.readyCount}/{progress.totalCount} Ready
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    allReady ? 'bg-green-500' : partialReady ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${(progress.readyCount / progress.totalCount) * 100}%`,
                  }}
                />
              </div>
              
              {visibleItems.map((li) => (
                <div
                  key={li.id}
                  className={`border-2 rounded-xl p-3 sm:p-4 space-y-3 transition-all ${
                    li.status === 'ready'
                      ? 'bg-green-100/50 dark:bg-green-900/30 border-green-400'
                      : li.status === 'served'
                      ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-bold text-lg leading-tight text-slate-800 dark:text-slate-100">
                        <span className="text-amber-600 dark:text-amber-400 font-black mr-2">{li.quantity}x</span>
                        {li.menu_item_name}
                      </div>
                      {li.special_instructions && (
                        <div className="text-xs text-red-700 dark:text-red-400 font-bold mt-2 bg-red-100/80 dark:bg-red-900/30 p-2 rounded-lg border border-red-200 dark:border-red-800/50 flex items-start gap-1.5">
                          🔔 {li.special_instructions}
                        </div>
                      )}
                    </div>
                    {li.status === 'ready' && (
                      <span className="text-[10px] px-2 py-1 bg-green-500 text-white rounded-md font-black tracking-widest shadow-sm">
                        ✓ READY
                      </span>
                    )}
                  </div>
                  
                  {/* Large Touch Targets for Tablet/Phone */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    {['preparing', 'ready', 'served'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`py-2.5 px-1 rounded-xl text-xs sm:text-sm capitalize font-bold transition-transform active:scale-95 shadow-sm ${
                          li.status === s
                            ? s === 'ready'
                              ? 'bg-green-500 text-white ring-2 ring-green-500 ring-offset-2 dark:ring-offset-slate-900'
                              : s === 'served'
                              ? 'bg-slate-600 text-white'
                              : 'bg-amber-500 text-white ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                        onClick={() => bump(o.id, li.id, s)}
                      >
                        {s === 'ready' && li.status === s ? '✓ ' : ''}{s}
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
