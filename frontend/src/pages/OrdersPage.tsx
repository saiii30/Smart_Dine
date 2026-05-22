import { useEffect, useState, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable, MenuItem, Order } from '../types'
import { useOrderSocket } from '../hooks/useOrderSocket'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingBag, Clock, ChefHat, X, Minus, Plus, ShoppingCart, ArrowLeft, Search } from 'lucide-react'

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  served: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

const OrdersPage = () => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
 

  const [tableId, setTableId] = useState<number | ''>('')
  const [seatCount, setSeatCount] = useState<number>(1)
  const [customerName, setCustomerName] = useState<string>('')
  const [cart, setCart] = useState<{ menu_item_id: number; name: string; price: number; quantity: number; special_instructions?: string }[]>([])

  const [open, setOpen] = useState(false)
  const [addToOrderId, setAddToOrderId] = useState<number | null>(null)
  const [addCart, setAddCart] = useState<{ menu_item_id: number; name: string; price: number; quantity: number; special_instructions?: string }[]>([])
  const [menuSearch, setMenuSearch] = useState('')
  const [showMobileCart, setShowMobileCart] = useState(false)

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [tableFilter, setTableFilter] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const initialized = useRef(false)

  const load = () => {
    void api.get<Order[]>('/orders').then((r) => setOrders(r.data))
  }

  useEffect(() => {
    load()
    void api.get('/tables').then((r) => setTables(r.data))
    void api.get('/menu-items').then((r) => setMenu(r.data))
    void api.get('/schedule').then((r) => setSchedule(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  useOrderSocket(() => {
    load()
    toast('Live update 🔔')
  })

  useEffect(() => {
    const handleInitialTable = async () => {
      if (!initialized.current && location.state?.openNewOrderForTable) {
        initialized.current = true
        const tId = location.state.openNewOrderForTable
        const sCount = location.state.seatCount
        const sName = location.state.seatName
        
        try {
          const res = await api.get<Order[]>('/orders')
          setOrders(res.data)
          
          setTableId(tId)
          if (sCount) setSeatCount(sCount)
          if (sName) setCustomerName(sName)
          
          
          const active = res.data.filter(o => o.table_id === tId && o.status !== 'completed' && o.status !== 'cancelled')
          
          if (sName && sName.startsWith('Seat')) {
            const seatOrder = active.find(o => o.customer_name === sName)
            setAddToOrderId(seatOrder ? seatOrder.id : null)
          } else {
            const fullTableOrder = active.find(o => !o.customer_name?.startsWith('Seat'))
            setAddToOrderId(fullTableOrder ? fullTableOrder.id : null)
          }
          setOpen(true)
        } catch (e) {}
        
        // Clear state without triggering a router navigation jump
        window.history.replaceState({}, '')
      }
    }
    handleInitialTable()
  }, [location.state])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (open || addToOrderId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, addToOrderId])

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    // Hide empty placeholder seating orders
    if (o.items.length === 0) return false

    // Filter by status
    if (statusFilter && o.status !== statusFilter) return false
    
    // Filter by table
    if (tableFilter !== null && o.table_id !== tableFilter) return false
    
    // Filter by search term (order ID or customer name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesId = o.id.toString().includes(searchLower)
      const matchesCustomer = o.customer_name?.toLowerCase().includes(searchLower)
      if (!matchesId && !matchesCustomer) return false
    }
    
    return true
  })

  const { activeIds: activeItemIds, slotOosIds } = useMemo(() => {
    if (!schedule || schedule.length === 0) return { activeIds: new Set<number>(), slotOosIds: new Set<number>() }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = days[currentTime.getDay()]
    const yesterday = days[(currentTime.getDay() + 6) % 7]
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes()

    const parseTime = (ts: string) => {
      // Try 12-hour format first (e.g. "09:00 AM" from schedule slots)
      const match12 = ts.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
      if (match12) {
          let [, h, m, ampm] = match12
          let hours = parseInt(h, 10)
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0 // Midnight case
          return hours * 60 + parseInt(m || '0', 10)
      }
      // Try 24-hour format (e.g. "14:30" from native <input type="time">)
      const match24 = ts.match(/^(\d{1,2}):(\d{2})$/)
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
  }, [schedule, menu, currentTime])

  const selectedTable = tables.find((t) => t.id === tableId)
  const remainingSeats = selectedTable
    ? Math.max(
        0,
        selectedTable.capacity -
          orders
            .filter(
              (o) =>
                o.table_id === tableId &&
                o.status !== 'completed' &&
                o.status !== 'cancelled'
            )
            .reduce((sum, o) => sum + (o.seat_count || 1), 0)
      )
    : 0

  const submit = async () => {
    const finalSeatCount = customerName.startsWith('Seat') ? seatCount : Math.max(1, remainingSeats)

    if (cart.length > 0) {
      await api.post('/orders', {
        table_id: tableId || null,
        seat_count: tableId ? finalSeatCount : 1,
        customer_name: customerName === 'Full Table' ? undefined : (customerName || undefined),
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          special_instructions: item.special_instructions || null,
        })),
      })
      toast.success('Order placed')
    }
   
    setOpen(false)
    setShowMobileCart(false)
    setCart([])
    setCustomerName('')
    setTableId('')
    load()
  }

  const addToOrder = async () => {
    if (!addToOrderId || !addCart.length) {
      toast.error('Select items to add')
      return
    }

    await api.post(`/orders/${addToOrderId}/items`, 
      addCart.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        special_instructions: item.special_instructions || null,
      }))
    )

    toast.success('Items added to order')
    setAddToOrderId(null)
    setOpen(false)
    setShowMobileCart(false)
    setAddCart([])
    setTableId('')
    load()
  }

  // Get active orders for selected table
  const activeOrdersForTable = tableId !== '' ? orders.filter(o => o.table_id === tableId && o.status !== 'completed' && o.status !== 'cancelled') : []

const getOrderStatus = (order: Order) => {

  // final statuses
  if (order.status === 'completed') return 'completed'
  if (order.status === 'cancelled') return 'cancelled'

  const activeItems = order.items.filter(
    (i) => i.status !== 'cancelled'
  )

  if (activeItems.length === 0) {
    return order.status === 'pending' ? 'pending' : 'cancelled'
  }

  const allServed = activeItems.every(
    (i) => i.status === 'served'
  )

  const anyPreparing = activeItems.some(
    (i) => i.status === 'preparing'
  )

  const anyReady = activeItems.some(
    (i) => i.status === 'ready'
  )

  // IMPORTANT
  // served items means food delivered
  // NOT billing completed
  if (allServed) return 'served'

  if (anyPreparing) return 'preparing'

  if (anyReady) return 'ready'

  return 'pending'
}

  // Calculate order progress
  const getOrderProgress = (order: Order) => {
    const activeItems = order.items.filter(i => i.status !== 'cancelled')
    const readyCount = activeItems.filter(i => i.status === 'ready').length
    const servedCount = activeItems.filter(i => i.status === 'served').length
    return {
      readyCount,
      servedCount,
      totalCount: activeItems.length,
    }
  }

  // Update individual item status
  const updateItemStatus = async (orderId: number, itemId: number, newStatus: string) => {
    await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status: newStatus })
    toast.success(`Item marked as ${newStatus}`)
    load()
  }

  // Cart helpers
  const currentCart = addToOrderId ? addCart : cart
  const cartTotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleAddToCart = (m: MenuItem) => {
    const setCurrentCart = addToOrderId ? setAddCart : setCart
    setCurrentCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === m.id)
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === m.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { menu_item_id: m.id, name: m.name, price: m.price, quantity: 1, special_instructions: '' }]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    const setCurrentCart = addToOrderId ? setAddCart : setCart
    setCurrentCart((prev) =>
      prev.map((i) => {
        if (i.menu_item_id === id) {
          const newQty = Math.max(0, i.quantity + delta)
          return { ...i, quantity: newQty }
        }
        return i
      }).filter((i) => i.quantity > 0)
    )
  }

  const updateInstruction = (id: number, text: string) => {
    const setCurrentCart = addToOrderId ? setAddCart : setCart
    setCurrentCart((prev) =>
      prev.map((i) => (i.menu_item_id === id ? { ...i, special_instructions: text } : i))
    )
  }
 
  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-slate-500">Real-time kitchen operations</p>
        </div>

       
      </div>

      {/* FILTERS */}
      <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm font-semibold">Status:</span>
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-1 rounded-lg text-sm ${
              statusFilter === null
                ? 'bg-black text-white'
                : 'bg-white dark:bg-slate-700 border'
            }`}
          >
            All
          </button>
          {['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm capitalize ${
                statusFilter === status
                  ? 'bg-black text-white'
                  : 'bg-white dark:bg-slate-700 border'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search by Order ID or Customer Name..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {tables.length > 0 && (
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={tableFilter === null ? '' : tableFilter}
              onChange={(e) =>
                setTableFilter(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">All Tables</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.table_number}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setStatusFilter(null)
              setTableFilter(null)
              setSearchTerm('')
            }}
            className="px-3 py-2 rounded-lg text-sm bg-slate-200 dark:bg-slate-600 hover:bg-slate-300"
          >
            Clear Filters
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* ORDERS GRID */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredOrders.map((o) => {

           const status = getOrderStatus(o)

          const progress = getOrderProgress(o)
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

            {/* HEADER */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="font-bold text-lg">
                  Order #{o.id}
                </h2>
                {o.customer_name && (
                  <div className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
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

            {/* PROGRESS BAR */}
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
                  width: `${progress.totalCount === 0 ? 0 : ((progress.readyCount + progress.servedCount) / progress.totalCount) * 100}%`,
                }}
              />
            </div>

            {/* ITEMS */}
            <div className="space-y-2 text-sm">
              {o.items.map((i) => (
                <div
                  key={i.id}
                  className={`border rounded-lg p-2 space-y-2 transition-all ${
                    i.status === 'served'
                      ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-400'
                      : i.status === 'ready'
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-400'
                      : i.status === 'preparing'
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400'
                      : 'bg-white/50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{i.menu_item_name}</div>
                      <div className="text-xs opacity-60">×{i.quantity}</div>
                      {i.special_instructions && (
                        <p className="text-xs text-slate-600 italic mt-1">
                          Note: {i.special_instructions}
                        </p>
                      )}
                    </div>
                    {i.status === 'ready' && (
                      <span className="text-xs px-2 py-1 bg-green-500 text-white rounded font-semibold">
                        ✓ READY
                      </span>
                    )}
                    {i.status === 'served' && (
                      <span className="text-xs px-2 py-1 bg-gray-600 text-white rounded font-semibold">
                        ✓ SERVED
                      </span>
                    )}
                    {i.status === 'cancelled' && (
                      <span className="text-xs px-2 py-1 bg-red-500 text-white rounded font-semibold">
                        ✕ CANCELLED
                      </span>
                    )}
                  </div>
                  
                  {/* Item status buttons - only show for non-completed and non-cancelled items */}
                  {o.status !== 'completed' && o.status !== 'cancelled' && i.status !== 'served' && i.status !== 'cancelled' && (
                    <div className="flex gap-1 flex-wrap">
                      {['preparing', 'ready', 'served', 'cancelled'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`px-2 py-1 rounded text-xs capitalize font-medium transition-all ${
                            i.status === s
                              ? s === 'ready'
                                ? 'bg-green-500 text-white'
                                : s === 'served'
                                ? 'bg-gray-600 text-white'
                                : s === 'cancelled'
                                ? 'bg-red-500 text-white'
                                : 'bg-blue-500 text-white'
                              : 'bg-white/80 dark:bg-slate-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                          onClick={() => updateItemStatus(o.id, i.id, s)}
                        >
                          {s === 'ready' || s === 'served' || s === 'cancelled' ? '✓' : ''} {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* FOOTER */}
            <div className="mt-4 flex justify-between items-center gap-2">
              <div>
                <div className="font-bold text-lg">₹{o.total_amount.toFixed(2)}</div>
                {o.table_name && o.seat_count && (
                  <div className="text-xs text-slate-500">
                    Table {o.table_name} • {o.seat_count} seat{o.seat_count > 1 ? 's' : ''}
                    {o.customer_name && ` • ${o.customer_name}`}
                  </div>
                )}
              </div>

              {/* <select
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
              </select> */}
            </div>

            {/* ADD ITEMS BUTTON */}
            <div className="flex gap-2 flex-wrap">
              
              {o.status !== 'completed' && o.status !== 'cancelled' && user?.role !== 'KITCHEN' && (
                <button
                  onClick={async () => {
                    await api.patch(`/orders/${o.id}/status`, null, {
                      params: { status: 'cancelled' },
                    })
                    toast.success('Order cancelled')
                    load()
                  }}
                  className="mt-2 flex-1 text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
          )
        })}
      </div>

      {/* EMPTY STATE */}
      {!filteredOrders.length && (
        <div className="text-center py-20 border rounded-2xl">
          <ChefHat className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 text-slate-500">
            {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          </p>
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl rounded-3xl overflow-hidden animate-in fade-in-90 slide-in-from-bottom-10 duration-300">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 relative">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="text-orange-600" />
                  {addToOrderId ? 'Add to Order' : 'New Order'}
                </h2>
                {addToOrderId && <p className="text-sm font-semibold text-slate-500 mt-1">Appending to Order #{addToOrderId}</p>}
              </div>

              <div className="flex items-center gap-4">
                <button
                  className="lg:hidden relative p-2 bg-orange-100 text-orange-600 rounded-xl"
                  onClick={() => setShowMobileCart(!showMobileCart)}
                >
                  <ShoppingCart />
                  {currentCart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {currentCart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => {
                    setOpen(false)
                    setAddToOrderId(null)
                    setCart([])
                    setAddCart([])
                    setTableId('')
                    setCustomerName('')
                  }}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
              
              {/* Menu Section */}
              <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                <div className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search menu..."
                      className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-4 sm:p-6 pb-32 lg:pb-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menu
                    .filter((m) => {
                      const matchesSearch = m.name.toLowerCase().includes(menuSearch.toLowerCase())
                      const isScheduled = activeItemIds.has(m.id)
                      
                      return matchesSearch && isScheduled
                    })
                    .map((m) => {
                      const isGlobalOos = m.is_available === false;
                      const isSlotOos = slotOosIds.has(m.id);
                      const isOos = isGlobalOos || isSlotOos;
                      return (
                      <div
                        key={m.id}
                        className={`group flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all ${
                          isOos ? 'opacity-50 grayscale-[50%] cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
                        }`}
                        onClick={() => !isOos && handleAddToCart(m)}
                      >
                        <div className="h-28 sm:h-32 bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                          {isOos && (
                            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 z-10 flex items-center justify-center backdrop-blur-[1px]">
                              <span className="bg-red-600 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-lg shadow-lg rotate-12">OUT OF STOCK</span>
                            </div>
                          )}
                          {m.image_url ? (
                            <img src={m.image_url} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl group-hover:scale-110 transition duration-500">
                              {m.is_veg ? '🥗' : '🍔'}
                            </div>
                          )}
                        </div>
                        <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2">{m.name}</h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{m.category_name}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-black text-orange-600 text-lg">₹{m.price}</span>
                            <div className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                              <Plus className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </div>

              {/* Cart Section */}
              <div className={`absolute inset-0 lg:static lg:w-[400px] flex flex-col bg-white dark:bg-slate-950 z-20 transition-transform duration-300 ${showMobileCart ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
                
                <div className="lg:hidden flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <button onClick={() => setShowMobileCart(false)} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-lg">Back to Menu</span>
                </div>

                <div className="flex-1 overflow-auto p-5">
                  {currentCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                      <ShoppingCart className="w-16 h-16 mb-4" />
                      <p className="font-medium text-lg">Cart is empty</p>
                      <p className="text-sm">Click items to add them</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentCart.map((item, index) => (
                        <div key={item.menu_item_id} className={`flex flex-col py-4 ${index < currentCart.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                          <div className="flex gap-4 items-center">
                            <div className="flex-1">
                              <div className="font-bold text-sm sm:text-base leading-tight pr-2">{item.name}</div>
                              <div className="font-bold text-orange-600 mt-1">₹{item.price * item.quantity}</div>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-lg">
                              <button onClick={() => updateQuantity(item.menu_item_id, -1)} className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><Minus className="w-4 h-4" /></button>
                              <span className="font-bold min-w-[1.5rem] text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.menu_item_id, 1)} className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><Plus className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder="Add note (e.g. extra spicy)..."
                            value={item.special_instructions || ''}
                            onChange={(e) => updateInstruction(item.menu_item_id, e.target.value)}
                            className="mt-3 w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={addToOrderId ? addToOrder : submit}
                    disabled={currentCart.length === 0}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <ChefHat className="w-5 h-5" />
                    {addToOrderId ? 'Send to Kitchen' : 'Place Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersPage