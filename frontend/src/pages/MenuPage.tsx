import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { MenuItem } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Trash2, Pencil } from 'lucide-react'

const MenuPage = () => {
  const { user } = useAuth()
  const isStaff = user?.role === 'WAITER' || user?.role === 'KITCHEN'
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const [q, setQ] = useState('')
  const [veg, setVeg] = useState(false)

  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const [selectedDays, setSelectedDays] = useState<string[]>(ALL_DAYS)

  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_veg: false,
    available_time_start: '',
    available_time_end: '',
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
  }

  useEffect(() => {
    load()

    void api.get('/categories').then((r) => {
      setCategories(r.data)
    })
  }, [veg])

  const search = () => load()

  const saveMenu = async () => {
    try {
      if (
        !form.name ||
        !form.price ||
        !form.category_id
      ) {
        toast.error('Fill all required fields')
        return
      }

      let updatedItem: MenuItem;

      if (editId) {
        const response = await api.patch(`/menu-items/${editId}`, {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category_id: Number(form.category_id),
          is_veg: form.is_veg,
        })
        updatedItem = response.data as MenuItem;
      } else {
        const response = await api.post('/menu-items', {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category_id: Number(form.category_id),
          is_veg: form.is_veg,
          is_available: true,
        })
  
        updatedItem = response.data as MenuItem;
      }

      const formatTo12h = (time24: string): string => {
        if (!time24) return '';
        const [h, m] = time24.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
      };

      const timeInput = (form.available_time_start && form.available_time_end) 
        ? `${formatTo12h(form.available_time_start)} - ${formatTo12h(form.available_time_end)}` 
        : 'All Day'

      if (timeInput !== 'All Day' || selectedDays.length < 7) {
        const assignToast = toast.loading('Assigning to schedule...')

        try {
          const schedulePromise = api.get('/schedule');
          const [scheduleRes] = await Promise.all([schedulePromise]);
          
          let currentSlots = scheduleRes.data || [];

          if (editId) {
            currentSlots = currentSlots.map((s: any) => ({
              ...s,
              items: s.items.filter((i: any) => i.id !== editId)
            }))
          }

          const existingSlot = currentSlots.find((s: any) => 
            s.time === timeInput && 
            s.activeDays.length === selectedDays.length && 
            s.activeDays.every((d: string) => selectedDays.includes(d)) &&
            !['Breakfast', 'Lunch', 'Dinner'].includes(s.name)
          )

          if (existingSlot) {
            existingSlot.items.push(updatedItem)
          } else {
            currentSlots.push({
              id: `slot-${Date.now()}`,
              name: `${updatedItem.name} Custom Slot`,
              time: timeInput,
              activeDays: selectedDays,
              items: [updatedItem]
            })
          }
          await api.post('/schedule', { slots: currentSlots })
          toast.success(`Assigned to custom schedule`, { id: assignToast })

        } catch (scheduleError) {
          toast.error('Failed to update schedule.', { id: assignToast })
        }
      } else if (editId) {
        try {
          const scheduleRes = await api.get('/schedule');
          let currentSlots = scheduleRes.data || [];
          let changed = false;
          currentSlots = currentSlots.map((s: any) => {
            const initLen = s.items.length;
            s.items = s.items.filter((i: any) => i.id !== editId);
            if (initLen !== s.items.length) changed = true;
            return s;
          });
          if (changed) {
            await api.post('/schedule', { slots: currentSlots });
          }
        } catch (e) {}
      }

      toast.success(editId ? 'Menu updated successfully' : 'Menu added successfully')

      setShowAdd(false)
      setEditId(null)

      setForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        is_veg: false,
        available_time_start: '',
        available_time_end: '',
      })
      setSelectedDays(ALL_DAYS)

      load()
    } catch (err: any) {
      console.log(err.response?.data)
      toast.error(
        err.response?.data?.detail || (editId ? 'Failed to update menu' : 'Failed to create menu')
      )
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
              onClick={() => {
                setEditId(null)
                setForm({
                  name: '',
                  description: '',
                  price: '',
                  category_id: '',
                  is_veg: false,
                  available_time_start: '',
                  available_time_end: '',
                })
                setShowAdd(true)
              }}
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
            className="group rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300"
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
                    m.is_available !== false
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {m.is_available !== false
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

                <div className="flex items-center gap-3">
                  {canDelete && (
                    <>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors"
                        title="Edit Menu Item"
                        onClick={async (e) => {
                          e.stopPropagation()

                          let start = '';
                          let end = '';
                          let days = ALL_DAYS;

                          try {
                            const res = await api.get('/schedule');
                            const slots = res.data || [];
                            const itemSlot = slots.find((s: any) => s.items.some((i: any) => i.id === m.id));
                            if (itemSlot) {
                               days = itemSlot.activeDays || ALL_DAYS;
                               if (itemSlot.time && itemSlot.time !== 'All Day') {
                                  const parts = itemSlot.time.split('-');
                                  if (parts.length === 2) {
                                      const parseTo24 = (t: string) => {
                                         const match = t.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
                                         if (match) {
                                             let h = parseInt(match[1]);
                                             if (match[3].toUpperCase() === 'PM' && h < 12) h += 12;
                                             if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
                                             return `${h.toString().padStart(2, '0')}:${match[2] || '00'}`;
                                         }
                                         return t.trim();
                                      };
                                      start = parseTo24(parts[0]);
                                      end = parseTo24(parts[1]);
                                  }
                               }
                            }
                          } catch (err) {}

                          setForm({
                            name: m.name,
                            description: m.description || '',
                            price: String(m.price),
                            category_id: String(m.category_id || ''),
                            is_veg: m.is_veg,
                            available_time_start: start,
                            available_time_end: end,
                          })
                          setSelectedDays(days)
                          setEditId(m.id)
                          setShowAdd(true)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                        title="Delete Menu Item"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!confirm(`Are you sure you want to delete "${m.name}"?`)) return
                          try {
                            await api.delete(`/menu-items/${m.id}`)
                            toast.success('Deleted successfully')
                            load()
                          } catch {
                            toast.error('Failed to delete')
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* ADD MODAL */}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-2xl font-bold">
                {editId ? 'Edit Menu Item' : 'Add New Menu'}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {editId ? 'Update restaurant item details' : 'Create new restaurant item'}
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

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-500 ml-1">Available Days</label>
                <button
                  type="button"
                  onClick={() => setSelectedDays(selectedDays.length === 7 ? [] : ALL_DAYS)}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md transition-colors"
                >
                  {selectedDays.length === 7 ? 'Clear All' : 'All Days'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(day => {
                  const isActive = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDays(prev => isActive ? prev.filter(d => d !== day) : [...prev, day])}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Start Time (Optional)</label>
                <input
                  type="time"
                  value={form.available_time_start}
                  onChange={(e) =>
                    setForm({ ...form, available_time_start: e.target.value })
                  }
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">End Time (Optional)</label>
                <input
                  type="time"
                  value={form.available_time_end}
                  onChange={(e) =>
                    setForm({ ...form, available_time_end: e.target.value })
                  }
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
                />
              </div>
            </div>

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
                onClick={() => {
                  setShowAdd(false)
                  setEditId(null)
                  setForm({
                    name: '',
                    description: '',
                    price: '',
                    category_id: '',
                    is_veg: false,
                    available_time_start: '',
                    available_time_end: '',
                  })
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveMenu}
                className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium"
              >
                {editId ? 'Update Menu' : 'Create Menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuPage