import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { MenuItem } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { autoAssignItemToSlots } from '../utils/scheduleUtils'

const MenuPage = () => {
  const { user } = useAuth()
  const isStaff = user?.role === 'WAITER' || user?.role === 'KITCHEN'
  const canToggle = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'KITCHEN'

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const [q, setQ] = useState('')
  const [veg, setVeg] = useState(false)

  const [showAdd, setShowAdd] = useState(false)

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

      const response = await api.post('/menu-items', {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category_id: Number(form.category_id),
        is_veg: form.is_veg,
        is_available: true,
      })

      const newMenuItem = response.data as MenuItem

      const timeInput = (form.available_time_start && form.available_time_end) 
        ? `${form.available_time_start} - ${form.available_time_end}` 
        : ''

      if (timeInput) {
        const assignToast = toast.loading('Assigning to schedule...')

        try {
          const schedulePromise = api.get('/schedule');
          const settingsPromise = api.get('/settings');
          const [scheduleRes, settingsRes] = await Promise.all([schedulePromise, settingsPromise]);
          
          const settings = settingsRes.data;
          let currentSlots = scheduleRes.data
          if (currentSlots && currentSlots.length > 0) {
            // If a schedule exists, ensure its times are updated from settings, as they might be stale.
            currentSlots = currentSlots.map((slot: any) => {
              if (slot.name === 'Breakfast' && settings.breakfast_time) {
                return { ...slot, time: settings.breakfast_time };
              }
              if (slot.name === 'Lunch' && settings.lunch_time) {
                return { ...slot, time: settings.lunch_time };
              }
              if (slot.name === 'Dinner' && settings.dinner_time) {
                return { ...slot, time: settings.dinner_time };
              }
              return slot;
            });
          } else {
            currentSlots = [
              { id: 'slot-1', name: 'Breakfast', time: settings.breakfast_time || '09:00 AM - 11:00 AM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] },
              { id: 'slot-2', name: 'Lunch', time: settings.lunch_time || '12:00 PM - 04:00 PM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] },
              { id: 'slot-3', name: 'Dinner', time: settings.dinner_time || '05:00 PM - 10:00 PM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] },
            ];
          }

          const { newSlots, assignedSlotNames, hasChanges } = autoAssignItemToSlots(newMenuItem, timeInput, currentSlots)

          if (hasChanges) {
            await api.post('/schedule', { slots: newSlots })
            toast.success(`Assigned to: ${assignedSlotNames.join(', ')}`, { id: assignToast })
          } else {
            if (assignedSlotNames.length > 0) {
              toast.success(`${newMenuItem.name} already in schedule: ${assignedSlotNames.join(', ')}`, { id: assignToast })
            } else {
              toast.error('Could not auto-assign. Check time format.', { id: assignToast })
            }
          }

        } catch (scheduleError) {
          toast.error('Failed to update schedule.', { id: assignToast })
        }
      }

      toast.success('Menu added successfully')

      setShowAdd(false)

      setForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        is_veg: false,
        available_time_start: '',
        available_time_end: '',
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

                {canToggle && (
                  <button
                    type="button"
                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        const nv = m.is_available === false ? true : false

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