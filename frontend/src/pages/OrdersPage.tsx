import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable, MenuItem, Order } from '../types'
import { useOrderSocket } from '../hooks/useOrderSocket'
import { ShoppingBag, Clock, ChefHat, X, Minus, Plus, ShoppingCart, ArrowLeft } from 'lucide-react'

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  served: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

const OrdersPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [open, setOpen] = useState(false)

  const [tableId, setTableId] = useState<number | ''>('')
  const [seatCount, setSeatCount] = useState<number>(1)
  const [customerName, setCustomerName] = useState<string>('')
  const [cart, setCart] = useState<{ menu_item_id: number; name: string; price: number; quantity: number; special_instructions?: string }[]>([])

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
          setOpen(true)
          
          const active = res.data.filter(o => o.table_id === tId && o.status !== 'completed' && o.status !== 'cancelled')
          
          if (sName && sName.startsWith('Seat')) {
            const seatOrder = active.find(o => o.customer_name === sName)
            setAddToOrderId(seatOrder ? seatOrder.id : null)
          } else {
            const fullTableOrder = active.find(o => !o.customer_name?.startsWith('Seat'))
            setAddToOrderId(fullTableOrder ? fullTableOrder.id : null)
          }
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
    if (!cart.length) {
      toast.error('Select items')
      return
    }

  

    await api.post('/orders', {
      table_id: tableId || null,
      seat_count: tableId ? seatCount : 1,
      customer_name: customerName || undefined,
      items: cart.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        special_instructions: item.special_instructions || null,
      })),
    })

    toast.success('Order placed')
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
    return 'cancelled'
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
      totalCount: activeItems.length || order.items.length,
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
 
  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-slate-500">Real-time kitchen operations</p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-black text-white flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <ShoppingBag className="h-4 w-4" />
          New Order
        </button>
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
                  width: `${((progress.readyCount + progress.servedCount) / progress.totalCount) * 100}%`,
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
              {o.status !== 'completed' && o.status !== 'cancelled' && (
                <button
                  onClick={() => setAddToOrderId(o.id)}
                  className="mt-2 flex-1 text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                >
                  + Add Items
                </button>
              )}
              {o.status !== 'completed' && o.status !== 'cancelled' && (
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
      {(open || addToOrderId) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-950 w-full h-full sm:h-[95vh] sm:max-w-[1400px] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold leading-tight">
                    {addToOrderId ? `Add Items to Order #${addToOrderId}` : 'New POS Order'}
                  </h2>
                  {addToOrderId && (
                    <p className="text-xs text-slate-500 font-medium">
                      {orders.find(o => o.id === addToOrderId)?.customer_name || 'Guest'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  setAddToOrderId(null)
                  setCart([])
                  setAddCart([])
                  setMenuSearch('')
                  setTableId('')
                  setCustomerName('')
                  setSeatCount(1)
                  setShowMobileCart(false)
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-hidden flex w-full relative">
              
              {/* LEFT: Menu Area */}
              <div className={`flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 p-4 sm:p-6 ${showMobileCart ? 'hidden lg:block' : 'block'}`}>
                <div className="mb-6">
                  <input 
                    placeholder="Search menu..." 
                    value={menuSearch}
                    onChange={e => setMenuSearch(e.target.value)}
                    className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menu
                    .filter(m => m.is_available)
                    .filter(m => m.name.toLowerCase().includes(menuSearch.toLowerCase()))
                    .map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleAddToCart(m)}
                        className="group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.98] flex flex-col"
                      >
                        <div className="relative h-32 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          {m.image_url ? (
                            <img src={m.image_url} alt={m.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                          ) : (
                            <div className="h-full flex items-center justify-center text-4xl">
                              {m.is_veg ? '🥗' : '🍔'}
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                            ₹{m.price}
                          </div>
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h3 className="font-bold text-sm leading-tight line-clamp-2">{m.name}</h3>
                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${m.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                          <p className="text-xs text-slate-500 mt-auto line-clamp-1">{m.category_name}</p>
                        </div>
                      </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Cart Sidebar */}
              <div className={`w-full lg:w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col h-full shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-none z-20 ${showMobileCart ? 'flex' : 'hidden lg:flex'}`}>
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowMobileCart(false)} 
                      className="lg:hidden p-2 -ml-2 mr-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <ShoppingCart className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-bold">Current Order</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-10 space-y-3">
                      <ShoppingBag className="w-10 h-10 opacity-20" />
                      <p>Tap menu items to add to order</p>
                    </div>
                  ) : (
                    currentCart.map((item) => (
                      <div key={item.menu_item_id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 leading-tight">
                            <div className="font-semibold text-sm">{item.name}</div>
                            <div className="text-xs text-orange-600 font-bold mt-1">₹{(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-lg p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button onClick={() => updateQuantity(item.menu_item_id, -1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><Minus className="w-4 h-4" /></button>
                            <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.menu_item_id, 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><Plus className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <input
                          placeholder="Special instructions (e.g. no ice)"
                          value={item.special_instructions || ''}
                          onChange={(e) => {
                            const setCurrentCart = addToOrderId ? setAddCart : setCart
                            setCurrentCart(prev => prev.map(i => i.menu_item_id === item.menu_item_id ? { ...i, special_instructions: e.target.value } : i))
                          }}
                          className="w-full mt-3 p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:border-orange-500 transition-colors"
                        />
                      </div>
                    ))
                  )}
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 space-y-4">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                      {tableId ? 'Order For' : 'Order Type'}
                    </label>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {tableId ? `Table ${tables.find(t => t.id === tableId)?.table_number} ${customerName ? `- ${customerName}` : ''}` : 'Takeaway'}
                    </span>
                  </div>

                  {!addToOrderId && (
                    <>
                      {!tableId && (
                        <input 
                          placeholder="Customer Name (Optional)" 
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-sm outline-none focus:border-orange-500 transition-colors"
                        />
                      )}
                      {tableId !== '' && remainingSeats === 0 && (
                        <div className="text-sm text-red-600 font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800/50">
                          Table is full (0 seats available).
                        </div>
                      )}
                      {tableId !== '' && remainingSeats > 0 && customerName === 'Full Table' && selectedTable && remainingSeats < selectedTable.capacity && (
                        <div className="text-sm text-red-600 font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800/50 leading-snug">
                          {selectedTable.capacity - remainingSeats} seat(s) already occupied. Cannot create a new Full Table order. Please select specific empty seats from the Floor Plan.
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-between items-center py-2 px-1 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <span className="font-bold text-slate-500 text-sm uppercase tracking-wider">Total</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">₹{cartTotal.toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={addToOrderId ? addToOrder : submit}
                    disabled={currentCart.length === 0 || (!addToOrderId && tableId !== '' && remainingSeats === 0) || (!addToOrderId && tableId !== '' && customerName === 'Full Table' && !!selectedTable && remainingSeats < selectedTable.capacity)}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <ChefHat className="w-5 h-5" />
                    {addToOrderId ? 'Send to Kitchen' : 'Place Order'}
                  </button>
                </div>
              </div>
            </div>

            {/* MOBILE BOTTOM CART TOGGLE */}
            {!showMobileCart && (
              <div className="lg:hidden p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-20">
                <button 
                  onClick={() => setShowMobileCart(true)}
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-between px-6 transition-all active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    {currentCart.reduce((sum, i) => sum + i.quantity, 0)} Items
                  </span>
                  <span>View Cart • ₹{cartTotal.toFixed(2)}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersPage