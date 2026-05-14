import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable, MenuItem, Order } from '../types'
import { useOrderSocket } from '../hooks/useOrderSocket'
import { ShoppingBag, Clock, ChefHat } from 'lucide-react'

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  served: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [open, setOpen] = useState(false)

  const [tableId, setTableId] = useState<number | ''>('')
  const [seatCount, setSeatCount] = useState<number>(1)
  const [cart, setCart] = useState<{ menu_item_id: number; quantity: number; special_instructions?: string }[]>([])

  const [addToOrderId, setAddToOrderId] = useState<number | null>(null)
  const [addCart, setAddCart] = useState<{ menu_item_id: number; quantity: number; special_instructions?: string }[]>([])

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [tableFilter, setTableFilter] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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
      items: cart.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        special_instructions: item.special_instructions || null,
      })),
    })

    toast.success('Order placed')
    setOpen(false)
    setCart([])
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
    setAddCart([])
    load()
  }

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

 
  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-slate-500">Real-time kitchen operations</p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-black text-white flex items-center gap-2"
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
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="font-bold text-lg">
                  Order #{o.id}
                </h2>
                <p className="text-xs text-slate-500">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {progress.readyCount}/{progress.totalCount} Ready
                </p>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 space-y-4">

            <h2 className="text-lg font-semibold">
              {addToOrderId ? `Add Items to Order #${addToOrderId}` : 'Create Order'}
            </h2>

            {!addToOrderId && (
              <select
                className="w-full border rounded-xl p-2"
                value={tableId}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : ''
                  setTableId(value)
                  setSeatCount(1)
                }}
              >
                <option value="">Select table (optional)</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.table_number} ({t.capacity} seats)
                  </option>
                ))}
              </select>
            )}
            {tableId && (
              <>
                {remainingSeats > 0 ? (
                  <div className="flex items-center gap-2 mt-3">
                    <label className="text-sm font-medium">Seats:</label>
                    <input
                      type="number"
                      min={1}
                      max={remainingSeats}
                      value={seatCount}
                      className="w-24 border rounded-xl p-2"
                      onChange={(e) => {
                        const value = Number(e.target.value) || 1
                        setSeatCount(Math.min(Math.max(1, value), remainingSeats))
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-red-600 mt-3">
                    No seats available on this table. Choose another table.
                  </div>
                )}
                {selectedTable && (
                  <div className="text-xs text-slate-500">
                    {remainingSeats} seat{remainingSeats === 1 ? '' : 's'} available on this table
                  </div>
                )}
              </>
            )}

            <div className="max-h-60 overflow-auto space-y-4">
              {menu
                .filter((m) => m.is_available)
                .map((m) => {
                  const currentCart = addToOrderId ? addCart : cart
                  const setCurrentCart = addToOrderId ? setAddCart : setCart
                  
                  const line = currentCart.find(
                    (c) => c.menu_item_id === m.id
                  )

                  return (
                    <div
                      key={m.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {m.name} ₹{m.price}
                        </span>
                        <input
                          type="number"
                          className="w-16 border rounded px-2 py-1"
                          value={line?.quantity || 0}
                          onChange={(e) => {
                            const q = Number(e.target.value)
                            setCurrentCart((prev) => {
                              const rest = prev.filter(
                                (x) => x.menu_item_id !== m.id
                              )
                              if (!q) return rest
                              return [...rest, { 
                                menu_item_id: m.id, 
                                quantity: q,
                                special_instructions: line?.special_instructions || ''
                              }]
                            })
                          }}
                        />
                      </div>
                      {line && (
                        <textarea
                          placeholder="Special instructions (e.g., no ice, extra spicy)"
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={line.special_instructions || ''}
                          onChange={(e) => {
                            setCurrentCart((prev) =>
                              prev.map((item) =>
                                item.menu_item_id === m.id
                                  ? { ...item, special_instructions: e.target.value }
                                  : item
                              )
                            )
                          }}
                        />
                      )}
                    </div>
                  )
                })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (addToOrderId) {
                    setAddToOrderId(null)
                    setAddCart([])
                  } else {
                    setOpen(false)
                    setCart([])
                  }
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={addToOrderId ? addToOrder : submit}
                disabled={!addToOrderId && tableId !== '' && remainingSeats === 0}
                className={`flex-1 py-3 rounded-xl ${
                  !addToOrderId && tableId !== '' && remainingSeats === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-black text-white'
                }`}
              >
                {addToOrderId ? 'Add to Order' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersPage