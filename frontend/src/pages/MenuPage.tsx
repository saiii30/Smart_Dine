import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { MenuItem, DiningTable, Order } from '../types'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOrderSocket } from '../hooks/useOrderSocket'

interface CartItem {
  menu_item_id: number
  name: string
  price: number
  quantity: number
  special_instructions?: string
}

const MenuPage = () => {
  const { user } = useAuth()
  const isStaff = user?.role === 'WAITER' || user?.role === 'KITCHEN'

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const [q, setQ] = useState('')
  const [veg, setVeg] = useState(false)

  const [showAdd, setShowAdd] = useState(false)

  // POS States
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [seatCount, setSeatCount] = useState<number>(1)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_veg: false,
  })

  const load = () => {
    void api
      .get<MenuItem[]>('/menu-items', {
        params: {
          q: q || undefined,
          veg_only: veg || undefined,
        },
      })
      .then((r) => setItems(r.data))
    void api.get<Order[]>('/orders').then((r) => setOrders(r.data))
  }

  useEffect(() => {
    load()

    void api.get('/categories').then((r) => {
      setCategories(r.data)
    })
    void api.get('/tables').then((r) => setTables(r.data))
  }, [veg])

  useOrderSocket(() => {
    void api.get<Order[]>('/orders').then((r) => setOrders(r.data))
  })

  const search = () => load()

  const createMenu = async () => {
    try {
      if (
        !form.name ||
        !form.price ||
        !form.category_id
      ) {
        toast.error('Fill all required fields')
        return
      }

      await api.post('/menu-items', {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category_id: Number(form.category_id),
        is_veg: form.is_veg,
        is_available: true,
      })

      toast.success('Menu added successfully')

      setShowAdd(false)

      setForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        is_veg: false,
      })

      load()
    } catch (err: any) {
      console.log(err.response?.data)

      toast.error(
        err.response?.data?.detail ||
          'Failed to create menu'
      )
    }
  }

  const addToCart = (item: MenuItem) => {
    if (!item.is_available) {
      toast.error('Item is currently unavailable')
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, special_instructions: '' }]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.menu_item_id === id) {
          const newQty = Math.max(0, i.quantity + delta)
          return { ...i, quantity: newQty }
        }
        return i
      }).filter((i) => i.quantity > 0)
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const selectedTable = tables.find((t) => t.id === Number(selectedTableId))
  
  const remainingSeats = selectedTable
    ? Math.max(
        0,
        selectedTable.capacity -
          orders
            .filter(
              (o) =>
                o.table_id === Number(selectedTableId) &&
                o.status !== 'completed' &&
                o.status !== 'cancelled'
            )
            .reduce((sum, o) => sum + (o.seat_count || 1), 0)
      )
    : 0

  const submitOrder = async () => {
    if (!selectedTableId) return toast.error("Please select a table!")
    if (remainingSeats < seatCount) return toast.error("Not enough seats available on this table!")
    if (cart.length === 0) return toast.error("Cart is empty!")

    try {
      await api.post('/orders', {
        table_id: Number(selectedTableId),
        customer_name: customerName || undefined,
        seat_count: seatCount,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          special_instructions: item.special_instructions || null
        }))
      })
      toast.success("Order sent to Kitchen! 👨‍🍳")

      setCart([])
      setCustomerName('')
      setSelectedTableId('')
      setSeatCount(1)
      void api.get<Order[]>('/orders').then((r) => setOrders(r.data))
    } catch {
      toast.error("Failed to place order")
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* HEADER */}

      <div className="flex-1 space-y-8 w-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Menu Management
          </h1>

          <p className="text-slate-500 mt-1">
            Manage restaurant food items and categories
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
          <input
            placeholder="Search menu..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none w-full sm:w-auto flex-1"
          />

          <button
            type="button"
            onClick={search}
            className="h-11 px-5 rounded-xl bg-slate-900 text-white dark:bg-orange-600"
          >
            Search
          </button>

          {!isStaff && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="h-11 px-5 rounded-xl bg-orange-600 text-white font-medium shadow-lg"
            >
              Add Menu
            </button>
          )}
        </div>
      </div>

      {/* FILTER */}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={veg}
            onChange={(e) => setVeg(e.target.checked)}
          />

          Veg only
        </label>
      </div>

      {/* MENU GRID */}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {items.map((m) => (
          <div
            key={m.id}
            onClick={() => addToCart(m)}
            className="group rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.98]"
          >
            {/* IMAGE */}

            <div className="relative h-52 overflow-hidden bg-slate-100 dark:bg-slate-800">
              {m.image_url ? (
                <img
                  src={m.image_url}
                  alt={m.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-6xl">
                  {m.is_veg ? '🥗' : '🍔'}
                </div>
              )}

              <div className="absolute top-3 right-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    m.is_available
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {m.is_available
                    ? 'Available'
                    : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* CONTENT */}

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">
                    {m.name}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {m.category_name}
                  </p>
                </div>

                <div className="text-xl font-bold text-orange-600">
                  ₹{m.price}
                </div>
              </div>

              <div className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                {m.description || 'No description'}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      m.is_veg
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                    }`}
                  >
                    {m.is_veg ? 'Veg' : 'Non Veg'}
                  </span>
                </div>

                {!isStaff && (
                  <button
                    type="button"
                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        const nv = !m.is_available

                        await api.patch(
                          `/menu-items/${m.id}`,
                          {
                            is_available: nv,
                          }
                        )

                        toast.success('Updated')

                        load()
                      } catch {
                        toast.error('Failed')
                      }
                    }}
                  >
                    Toggle
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* RIGHT AREA: Shopping Cart POS sidebar */}
      <div className="w-full lg:w-[400px] bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sticky top-6 max-h-[calc(100vh-2rem)]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-t-3xl">
          <ShoppingCart className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-bold">Current Order</h2>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm py-10">
              Tap menu items to add to order
            </div>
          ) : (
            cart.map((item) => (
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
                  onChange={(e) => setCart(prev => prev.map(i => i.menu_item_id === item.menu_item_id ? { ...i, special_instructions: e.target.value } : i))}
                  className="w-full mt-3 p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none"
                />
              </div>
            ))
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-b-3xl space-y-4">
          <select 
            value={selectedTableId} 
            onChange={(e) => {
              setSelectedTableId(e.target.value)
              setSeatCount(1)
            }}
            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 font-semibold outline-none"
          >
            <option value="" disabled>Select Table...</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>Table {t.table_number} ({t.capacity} seats)</option>
            ))}
          </select>

          {selectedTableId && (
            <>
              {remainingSeats > 0 ? (
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Seats</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      {remainingSeats} available
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={remainingSeats}
                      value={seatCount}
                      className="w-16 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-center font-bold outline-none"
                      onChange={(e) => {
                        const value = Number(e.target.value) || 1
                        setSeatCount(Math.min(Math.max(1, value), remainingSeats))
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600 font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800/50">
                  Table is full (0 seats available).
                </div>
              )}
            </>
          )}

          <input 
            placeholder="Customer Name (Optional)" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-sm outline-none"
          />

          <div className="flex justify-between items-center py-2 px-1">
            <span className="font-bold text-slate-500 text-sm uppercase tracking-wider">Total</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">₹{cartTotal.toFixed(2)}</span>
          </div>

          <button 
            onClick={submitOrder}
            disabled={cart.length === 0 || (selectedTableId !== '' && remainingSeats < seatCount)}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            Send Order to Kitchen
          </button>
        </div>
      </div>

      {/* ADD MODAL */}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-2xl font-bold">
                Add New Menu
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Create new restaurant item
              </p>
            </div>

            <input
              type="text"
              placeholder="Menu Name"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
            />

            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value,
                })
              }
              className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
            />

            <select
              value={form.category_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  category_id: e.target.value,
                })
              }
              className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
            >
              <option value="">
                Select Category
              </option>

              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_veg}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_veg: e.target.checked,
                  })
                }
              />

              Veg Item
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createMenu}
                className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium"
              >
                Create Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuPage