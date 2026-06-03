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
  const [dailySequenceMap, setDailySequenceMap] = useState<Map<number, number>>(new Map())
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

    // Fetch all orders to compute an accurate, stable daily sequence number
    void api.get<Order[]>('/orders').then((r) => {
      const todayOrders = r.data.filter((o) => {
        if (!(o as any).created_at) return true;
        const createdAt = (o as any).created_at as string;
        const orderDate = new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z');
        const today = new Date();
        return (
          orderDate.getDate() === today.getDate() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear()
        );
      });
      const allTodayItems = todayOrders.flatMap(o => o.items);
      allTodayItems.sort((a, b) => a.id - b.id);
      const map = new Map<number, number>();
      allTodayItems.forEach((item, index) => {
        map.set(item.id, index + 1);
      });
      setDailySequenceMap(map);
    }).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    loadMenu()
  }, [load, loadMenu])

  const { activeIds: activeItemIds, slotOosIds } = useMemo(() => {
    if (!schedule || schedule.length === 0) return { activeIds: new Set<number>(), slotOosIds: new Set<number>() }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const currentDayIdx = currentTime.getDay()
    const today = days[currentDayIdx]
    const yesterday = days[(currentDayIdx + 6) % 7]
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes()

    const parseTime = (ts: string) => {
      const match12 = ts.match(/(\d+)(?:[:.](\d+))?\s*(AM|PM)/i)
      if (match12) {
          let [, h, m, ampm] = match12
          let hours = parseInt(h, 10)
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
          return hours * 60 + parseInt(m || '0', 10)
      }
      const match24 = ts.match(/^(\d{1,2})[:.](\d{2})$/)
      if (match24) {
           let [, h, m] = match24
           return parseInt(h, 10) * 60 + parseInt(m, 10)
      }
      return null
    }

    const slotActiveMap = new Map<string, boolean>()
    schedule.forEach(slot => {
        let isSlotTimeActive = false;
        if (slot.time && !slot.time.toLowerCase().includes('all day')) {
           const [startStr, endStr] = slot.time.split('-').map((s: string) => s.trim())
           const startMins = parseTime(startStr || '')
           const endMins = parseTime(endStr || '')
           if (startMins !== null && endMins !== null) {
              if (startMins <= endMins) {
                 isSlotTimeActive = currentMins >= startMins && currentMins <= endMins
              } else {
                 isSlotTimeActive = currentMins >= startMins || currentMins <= endMins
              }
           }
        } else {
           isSlotTimeActive = true;
        }
        slotActiveMap.set(slot.id || slot.name, isSlotTimeActive)
    })

    const activeIds = new Set<number>()
    const slotOosIds = new Set<number>()

    schedule.forEach(slot => {
      slot.items.forEach((i: any) => {
        let itemDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        let itemStart = ''
        let itemEnd = ''

        if (i.description && i.description.includes('|META|')) {
           try {
             const meta = JSON.parse(i.description.split('|META|')[1]);
             if (meta.days && meta.days.length > 0) itemDays = meta.days;
             if (meta.start) itemStart = meta.start;
             if (meta.end) itemEnd = meta.end;
           } catch(e) {}
        }

        let isSlotTimeActive = slotActiveMap.get(slot.id || slot.name) || false;

        let isItemActive = false;
        const itemTimeStr = (itemStart && itemEnd) ? `${itemStart} - ${itemEnd}` : '';
        if (!itemTimeStr) {
            isItemActive = itemDays.includes(today);
        } else {
            const startMins = parseTime(itemStart);
            const endMins = parseTime(itemEnd);
            if (startMins !== null && endMins !== null) {
                if (startMins <= endMins) {
                    isItemActive = itemDays.includes(today) && currentMins >= startMins && currentMins <= endMins;
                } else {
                    const activeTonight = itemDays.includes(today) && currentMins >= startMins;
                    const activeFromLastNight = itemDays.includes(yesterday) && currentMins <= endMins;
                    isItemActive = activeTonight || activeFromLastNight;
                }
            } else {
                isItemActive = itemDays.includes(today);
            }
        }

        if (isItemActive && i.description && i.description.includes('|META|')) {
           try {
              const meta = JSON.parse(i.description.split('|META|')[1]);
              if (meta.hidden && meta.hidden.includes(`${today}_${slot.name}`)) {
                 isItemActive = false;
              }
           } catch(e) {}
        }

        const isItemCurrentlyActive = isSlotTimeActive && isItemActive;
        if (isItemCurrentlyActive) {
           activeIds.add(i.id)
           
           const key = `${today}_${slot.name}`;
           if (i.description && i.description.includes('|META|')) {
              try {
                  const meta = JSON.parse(i.description.split('|META|')[1]);
                  if (meta.oos && meta.oos.includes(key)) slotOosIds.add(i.id);
              } catch(e) {}
           }
        }
      })
    })
    return { activeIds, slotOosIds }
  }, [schedule, menuItems, currentTime])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const item = active.data.current as MenuItem
    const targetStatus = over.id === 'col-available' ? true : false

    let newDesc = item.description || '';
    let meta: any = { days: [], start: '', end: '', oos: [] };
    let baseDesc = newDesc;

    if (newDesc.includes('|META|')) {
        try {
            const parts = newDesc.split('|META|');
            baseDesc = parts[0].trim();
            meta = JSON.parse(parts[1]);
            if (!meta.oos) meta.oos = [];
        } catch(e) {}
    } else {
        meta.oos = [];
    }

    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const currentDayIdx = currentTime.getDay()
    const today = days[currentDayIdx]
    const yesterday = days[(currentDayIdx + 6) % 7]
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes()

    const parseTime = (ts: string) => {
      const match12 = ts.match(/(\d+)(?:[:.](\d+))?\s*(AM|PM)/i)
      if (match12) {
          let [, h, m, ampm] = match12
          let hours = parseInt(h, 10)
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
          return hours * 60 + parseInt(m || '0', 10)
      }
      const match24 = ts.match(/^(\d{1,2})[:.](\d{2})$/)
      if (match24) {
           let [, h, m] = match24
           return parseInt(h, 10) * 60 + parseInt(m, 10)
      }
      return null
    }

    const slotActiveMap = new Map<string, boolean>()
    schedule.forEach(slot => {
        let isSlotTimeActive = false;
        if (slot.time && !slot.time.toLowerCase().includes('all day')) {
           const [startStr, endStr] = slot.time.split('-').map((s: string) => s.trim())
           const startMins = parseTime(startStr || '')
           const endMins = parseTime(endStr || '')
           if (startMins !== null && endMins !== null) {
              if (startMins <= endMins) {
                 isSlotTimeActive = currentMins >= startMins && currentMins <= endMins
              } else {
                 isSlotTimeActive = currentMins >= startMins || currentMins <= endMins
              }
           }
        } else {
           isSlotTimeActive = true;
        }
        slotActiveMap.set(slot.id || slot.name, isSlotTimeActive)
    })

    let targetSlots = schedule.filter(slot => {
        if (!slot.items.some((i: any) => i.id === item.id)) return false;
        return slotActiveMap.get(slot.id || slot.name);
    });

    if (targetSlots.length === 0) {
        targetSlots = schedule.filter(slot => slot.items.some((i: any) => i.id === item.id));
    }
    const activeSlotsForThisItem = targetSlots;

    if (targetStatus) {
        activeSlotsForThisItem.forEach(s => {
            const key = `${todayStr}_${s.name}`;
            meta.oos = meta.oos.filter((k: string) => k !== key);
        });
    } else {
        activeSlotsForThisItem.forEach(s => {
            const key = `${todayStr}_${s.name}`;
            if (!meta.oos.includes(key)) meta.oos.push(key);
        });
    }

    newDesc = baseDesc ? `${baseDesc} |META|${JSON.stringify(meta)}` : `|META|${JSON.stringify(meta)}`;

    const globalStatus = targetStatus ? true : item.is_available; 

    if (item.description === newDesc && item.is_available === globalStatus) return;

    // Optimistic UI update
    setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: globalStatus, description: newDesc } : m))
    try {
      await api.patch(`/menu-items/${item.id}`, { is_available: globalStatus, description: newDesc })
      toast.success(targetStatus ? `${item.name} is Available` : `${item.name} is Out of Stock for current slot`)
      loadMenu()
    } catch {
      // Revert on failure
      setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: item.is_available, description: item.description } : m))
      toast.error('Failed to update stock')
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
    const activeItems = items.filter(i => i.status !== 'cancelled')
    if (activeItems.length === 0 && items.length > 0) return 'cancelled'

    const allServed = activeItems.every(i => i.status === 'served')
    const allReadyOrServed = activeItems.every(
      i => i.status === 'ready' || i.status === 'served'
    )
    const anyPreparing = activeItems.some(i => i.status === 'preparing')

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
    const activeItems = items.filter(i => i.status !== 'cancelled')
    const readyCount = activeItems.filter(i => i.status === 'ready').length
    const servedCount = activeItems.filter(i => i.status === 'served').length
    return { readyCount, servedCount, totalCount: activeItems.length }
  }

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => a.id - b.id)
  }, [orders])

  return (
    <div className="space-y-6 pb-24">
      <audio ref={audio} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />
      
      {/* App-like Sticky Header */}
      <div className="top-0 z-30 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 sm:mx-0 sm:px-0 py-4 shadow-sm flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
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
            {sortedOrders.length} ORDERS
          </div>
        </div>
      </div>

      {/* Tablet/Phone Optimized Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {sortedOrders.map((o) => {
          const visibleItems = o.items
          if (!visibleItems.length) return null

          const status = getOrderStatus(visibleItems)
          const progress = getOrderProgress(visibleItems)
          const allReady = progress.totalCount > 0 && progress.readyCount === progress.totalCount && progress.servedCount === 0
          const partialReady = progress.totalCount > 0 && progress.readyCount > 0 && progress.readyCount < progress.totalCount
          const allServed = progress.totalCount > 0 && progress.servedCount === progress.totalCount
          const allCancelled = progress.totalCount === 0 && visibleItems.length > 0

          return (
            <div
              key={o.id}
              className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
                allCancelled
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                  : allServed
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
                  <h2 className="font-bold text-xl flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-orange-600" /> Order #{o.id}
                  </h2>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
                    {o.table_name ? `Table ${o.table_name}` : 'Takeaway'}
                    {o.customer_name ? ` • ${o.customer_name}` : ''}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColor[status] || statusColor.pending}`}>
                    {status}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-300 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all ${
                    allCancelled
                      ? 'bg-red-500'
                      : allServed
                      ? 'bg-gray-500'
                      : allReady
                      ? 'bg-green-500'
                      : partialReady
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{
                    width: `${progress.totalCount === 0 ? (allCancelled ? 100 : 0) : ((progress.readyCount + progress.servedCount) / progress.totalCount) * 100}%`,
                  }}
                />
              </div>
              
              {/* ITEMS */}
              <div className="space-y-2 text-sm mt-4">
                {visibleItems.map((li) => {
                  const currentNumber = dailySequenceMap.get(li.id) || 0;
                  return (
                        <div
                          key={li.id}
                          className={`border rounded-lg p-2 space-y-2 transition-all ${
                            li.status === 'cancelled'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-300 opacity-75'
                              : li.status === 'served'
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
                              <div className={`font-medium flex items-start gap-2.5 ${li.status === 'cancelled' ? 'line-through text-red-700 dark:text-red-400' : ''}`}>
                                <span className="bg-orange-500 text-white min-w-[28px] px-1.5 py-0.5 rounded-md text-[13px] font-black text-center shrink-0 shadow-sm border border-orange-600">
                                  #{currentNumber || '?'}
                                </span>
                                <span className="mt-0.5 text-base">{li.menu_item_name}</span>
                              </div>
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
                            {li.status === 'cancelled' && (
                              <span className="text-xs px-2 py-1 bg-red-500 text-white rounded font-semibold">
                                ✕ CANCELLED
                              </span>
                            )}
                          </div>
                          
                          {/* Item status buttons */}
                          {li.status !== 'cancelled' && (
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
                          )}
                        </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* EMPTY STATE */}
      {!sortedOrders.length && (
        <div className="text-center py-20 border rounded-2xl bg-white dark:bg-slate-900">
          <ChefHat className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-slate-500">
            No active orders in the kitchen
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
                    items={menuItems.filter(m => (m.name.toLowerCase().includes(menuSearch.toLowerCase()) && activeItemIds.has(m.id) && m.is_available !== false && !slotOosIds.has(m.id)))} 
                    isAvailableCol={true} 
                  />
                </div>

                {/* OUT OF STOCK COLUMN */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-200 dark:border-red-900/30 overflow-hidden shadow-sm">
                  <DroppableColumn 
                    id="col-out-of-stock" 
                    title="Out of Stock" 
                    items={menuItems.filter(m => (m.name.toLowerCase().includes(menuSearch.toLowerCase()) && activeItemIds.has(m.id) && (m.is_available === false || slotOosIds.has(m.id))))} 
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
