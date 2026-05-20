import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { Order, MenuItem } from '../types'
import { useOrderSocket } from '../hooks/useOrderSocket'
import { Clock, ChefHat, GripVertical } from 'lucide-react'

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  served: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

// --- DRAG AND DROP COMPONENTS ---
const DraggableMenuCard = ({ item }: { item: MenuItem }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${item.id}`,
    data: item,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100, opacity: 0.9 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white dark:bg-slate-800 border rounded-xl shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing transition-shadow ${isDragging ? 'shadow-xl border-orange-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
    >
      <div>
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.name}</h3>
        <p className="text-[10px] text-slate-500 uppercase">{item.category_name}</p>
      </div>
      <GripVertical className="w-4 h-4 text-slate-400" />
    </div>
  )
}

const DroppableColumn = ({ id, title, items, isAvailableCol }: { id: string, title: string, items: MenuItem[], isAvailableCol: boolean }) => {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col transition-colors overflow-hidden ${
        isOver ? (isAvailableCol ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10') : ''
      }`}
    >
      <div className={`p-3 border-b text-center font-bold text-sm tracking-widest uppercase ${isAvailableCol ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800'}`}>
        {title} ({items.length})
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {items.map(item => (
          <DraggableMenuCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium text-center px-4 opacity-70">
            Drag items here
          </div>
        )}
      </div>
    </div>
  )
}

const Kitchen = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const audio = useRef<HTMLAudioElement | null>(null)
  const [showStockModal, setShowStockModal] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuSearch, setMenuSearch] = useState('')
  const [schedule, setSchedule] = useState<any[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const loadMenu = useCallback(() => {
    void api.get<MenuItem[]>('/menu-items').then((r) => setMenuItems(r.data))
    void api.get('/schedule').then((r) => setSchedule(r.data)).catch(() => {})
  }, [])

  const load = useCallback(() => {
    void api.get<Order[]>('/kitchen/orders').then((r) => setOrders(r.data))
  }, [])

  useEffect(() => {
    load()
    loadMenu()
  }, [load, loadMenu])

  const activeItemIds = useMemo(() => {
    if (!schedule || schedule.length === 0) return new Set(menuItems.map(m => m.id))

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = days[currentTime.getDay()]
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes()

    const parseTime = (ts: string) => {
      const match = ts.match(/(\d+):(\d+)\s*(AM|PM)/i)
      if (!match) return null
      let [, h, m, ampm] = match
      let hours = parseInt(h, 10)
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
      return hours * 60 + parseInt(m, 10)
    }

    const activeIds = new Set<number>()

    schedule.forEach(slot => {
      if (!slot.activeDays.includes(today)) return
      let isTimeActive = true
      if (slot.time && !slot.time.toLowerCase().includes('all day')) {
        const [startStr, endStr] = slot.time.split('-').map((s: string) => s.trim())
        const startMins = parseTime(startStr || '')
        const endMins = parseTime(endStr || '')
        if (startMins !== null && endMins !== null) {
          isTimeActive = currentMins >= startMins && currentMins <= endMins
        }
      }
      if (isTimeActive) {
        slot.items.forEach((i: any) => activeIds.add(i.id))
      }
    })
    return activeIds
  }, [schedule, menuItems, currentTime])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const item = active.data.current as MenuItem
    const targetStatus = over.id === 'col-available' ? true : false

    if ((item.is_available !== false) !== targetStatus) {
      // Optimistic UI update
      setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: targetStatus } : m))
      try {
        await api.patch(`/menu-items/${item.id}`, { is_available: targetStatus })
        toast.success(targetStatus ? `${item.name} is Available` : `${item.name} is Out of Stock`)
      } catch {
        // Revert on failure
        setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: !targetStatus } : m))
        toast.error('Failed to update stock')
      }
    }
  }

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStockModal(true)}
            className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-transform"
          >
            Manage Stock
          </button>
          <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-4 py-2 rounded-xl text-sm font-black shadow-sm border border-amber-200 dark:border-amber-800/50">
            {orders.length} ACTIVE
          </div>
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
          
          // Group items by category (Kitchen Section)
          const groupedItems = visibleItems.reduce((acc, i) => {
            const section = menuItems.find(m => m.id === i.menu_item_id)?.category_name || 'Other'
            if (!acc[section]) acc[section] = []
            acc[section].push(i)
            return acc
          }, {} as Record<string, typeof visibleItems>)

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
              
              {/* ITEMS GROUPED BY SECTION */}
              <div className="space-y-3 text-sm">
                {Object.entries(groupedItems).map(([section, items]) => (
                  <div key={section} className="bg-slate-50/50 dark:bg-slate-800/20 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-lg flex items-center gap-2 font-black text-xs uppercase tracking-widest border border-orange-200 dark:border-orange-500/30 shadow-sm">
                        <ChefHat className="w-4 h-4" /> {section}
                      </div>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      {items.map((li) => (
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

      {/* MANAGE STOCK MODAL */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div>
                <h2 className="text-xl font-bold">Manage Stock</h2>
                <p className="text-xs text-slate-500 mt-1">Drag items to mark them Available or Out of Stock</p>
              </div>
              <button onClick={() => setShowStockModal(false)} className="text-slate-500 hover:text-red-500 font-bold px-3 py-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg transition-colors">Close ✕</button>
            </div>
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <input 
                type="text" 
                placeholder="Search active items..." 
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <DndContext onDragEnd={handleDragEnd}>
              <div className="flex-1 overflow-hidden p-4 flex flex-col md:flex-row gap-4 bg-slate-100 dark:bg-slate-950">
                
                {/* AVAILABLE COLUMN */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 border-green-200 dark:border-green-900/30 overflow-hidden shadow-sm">
                  <DroppableColumn 
                    id="col-available" 
                    title="Available" 
                    items={menuItems.filter(m => (m.name.toLowerCase().includes(menuSearch.toLowerCase()) && (schedule.length === 0 || activeItemIds.has(m.id)) && m.is_available !== false))} 
                    isAvailableCol={true} 
                  />
                </div>

                {/* OUT OF STOCK COLUMN */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-200 dark:border-red-900/30 overflow-hidden shadow-sm">
                  <DroppableColumn 
                    id="col-out-of-stock" 
                    title="Out of Stock" 
                    items={menuItems.filter(m => (m.name.toLowerCase().includes(menuSearch.toLowerCase()) && (schedule.length === 0 || activeItemIds.has(m.id)) && m.is_available === false))} 
                    isAvailableCol={false} 
                  />
                </div>

              </div>
            </DndContext>
          </div>
        </div>
      )}
    </div>
  )
}

export default Kitchen
