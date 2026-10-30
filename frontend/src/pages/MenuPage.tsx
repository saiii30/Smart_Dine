import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { MenuItem } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Trash2, Pencil, X, ListPlus, Search, Check } from 'lucide-react'

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

  const [globalNotes, setGlobalNotes] = useState<string[]>([])
  const [showNotesPopup, setShowNotesPopup] = useState(false)
  const [noteSearch, setNoteSearch] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_veg: false,
    available_time_start: '',
    available_time_end: '',
    notes: [] as string[],
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    const baseUrl = import.meta.env.VITE_BACKEND_URL ;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

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

  api.get('/categories')
    .then((res) => {
      console.log('Categories:', res.data)
      setCategories(res.data)
    })
    .catch((err) => {
      console.log('Category error:', err.response?.data)
    })

  api.get('/settings')
    .then((r) => {
      if (r.data && r.data.global_notes) {
        setGlobalNotes(r.data.global_notes.split('|').filter(Boolean))
      }
    })
    .catch(() => {})
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

      let existingMeta: any = { oos: [], hidden: [], days: ALL_DAYS };
      let oldDays: string[] = ALL_DAYS;
      if (editId) {
          const m = items.find(i => i.id === editId);
          if (m && m.description && m.description.includes('|META|')) {
              try {
                  const parsed = JSON.parse(m.description.split('|META|')[1]);
                  existingMeta = { ...existingMeta, ...parsed };
                  if (parsed.days) oldDays = parsed.days;
              } catch(e) {}
          }
      } else {
          oldDays = []; 
      }

      const addedDays = selectedDays.filter(d => !oldDays.includes(d));

      const meta: any = { days: selectedDays, start: form.available_time_start, end: form.available_time_end, oos: existingMeta.oos, hidden: existingMeta.hidden || [], notes: form.notes };

      if (addedDays.length > 0) {
          try {
              const scheduleRes = await api.get('/schedule');
              const slots = scheduleRes.data;
              slots.forEach((slot: any) => {
                  addedDays.forEach(day => {
                      const hiddenKey = `${day}_${slot.name}`;
                      if (!meta.hidden.includes(hiddenKey)) {
                          meta.hidden.push(hiddenKey);
                      }
                  });
              });
          } catch(e) {}
      }

      const baseDesc = form.description.split('|META|')[0].trim();
      const finalDesc = baseDesc ? `${baseDesc} |META|${JSON.stringify(meta)}` : `|META|${JSON.stringify(meta)}`;

      if (editId) {
        await api.patch(`/menu-items/${editId}`, {
          name: form.name,
          description: finalDesc,
          price: Number(form.price),
          category_id: Number(form.category_id),
          is_veg: form.is_veg,
        })

        if (imageFile) {
          const formData = new FormData()
          formData.append('file', imageFile)
          await api.post(`/menu-items/${editId}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }

      } else {
        const res = await api.post('/menu-items', {
          name: form.name,
          description: finalDesc,
          price: Number(form.price),
          category_id: Number(form.category_id),
          is_veg: form.is_veg,
          is_available: true,
        })

        if (imageFile) {
          const formData = new FormData()
          formData.append('file', imageFile)
          await api.post(`/menu-items/${res.data.id}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
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
        notes: [],
      })
      setImagePreview('')
      setImageFile(null)
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
                  notes: [],
                })
                setImagePreview('')
                setImageFile(null)
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
                  src={getImageUrl(m.image_url)}
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
                {m.description ? m.description.split('|META|')[0].trim() || 'No description' : 'No description'}
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
                          let notes: string[] = [];
                          let desc = m.description || '';

                          if (m.description && m.description.includes('|META|')) {
                            try {
                              const parts = m.description.split('|META|');
                              desc = parts[0].trim();
                              const meta = JSON.parse(parts[1]);
                              if (meta.days) days = meta.days;
                              if (meta.start) start = meta.start;
                              if (meta.end) end = meta.end;
                              if (meta.notes) notes = meta.notes;
                            } catch(e) {}
                          }

                          setForm({
                            name: m.name,
                            description: desc,
                            price: String(m.price),
                            category_id: String(m.category_id || ''),
                            is_veg: m.is_veg,
                            available_time_start: start,
                            available_time_end: end,
                            notes: notes,
                          })
                          setSelectedDays(days)
                          setEditId(m.id)
                          setImagePreview(m.image_url || '')
                          setImageFile(null)
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

            {/* IMAGE UPLOAD */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img src={getImageUrl(imagePreview)} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <span className="text-2xl">🍔</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Menu Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-colors cursor-pointer"
                />
              </div>
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

            {/* QUICK NOTES COMPONENT */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500 ml-1">Custom Notes (Checkout Options)</label>
              <button
                type="button"
                onClick={() => {
                  setNoteSearch('')
                  setShowNotesPopup(true)
                }}
                className="flex items-center justify-center gap-2 h-12 w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ListPlus className="w-5 h-5" />
                Select Custom Notes
              </button>
              {form.notes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.notes.map((note, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-xs font-bold">
                      {note}
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, notes: prev.notes.filter((_, i) => i !== idx) }))} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

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
                    notes: [],
                  })
                  setImagePreview('')
                  setImageFile(null)
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

      {/* NOTES POPUP */}
      {showNotesPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ListPlus className="w-6 h-6 text-orange-600" />
                  Custom Notes
                </h2>
                <p className="text-sm text-slate-500 mt-1">Select modifiers available for this item.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowNotesPopup(false)} 
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            {globalNotes.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-9 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
                />
              </div>
            )}
            
            {/* List */}
            <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 pb-1">
              {globalNotes.length === 0 ? (
                <div className="col-span-2 text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <ListPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No custom notes found.</p>
                  <p className="text-xs text-slate-400 mt-1">Add them globally in the Settings page.</p>
                </div>
              ) : (
                globalNotes
                  .filter(n => n.toLowerCase().includes(noteSearch.toLowerCase()))
                  .map(note => {
                  const isSelected = form.notes.includes(note);
                  return (
                    <label 
                      key={note} 
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-sm' 
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm(prev => ({ ...prev, notes: [...prev.notes, note] }))
                          } else {
                            setForm(prev => ({ ...prev, notes: prev.notes.filter(n => n !== note) }))
                          }
                        }}
                      />
                      <div className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center border-2 transition-colors ${
                        isSelected 
                          ? 'bg-orange-500 border-orange-500' 
                          : 'bg-transparent border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-sm font-bold truncate ${
                        isSelected ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {note}
                      </span>
                    </label>
                  )
                })
              )}
              {globalNotes.length > 0 && globalNotes.filter(n => n.toLowerCase().includes(noteSearch.toLowerCase())).length === 0 && (
                <div className="col-span-2 text-center py-6 text-sm text-slate-500">
                  No notes matching "{noteSearch}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowNotesPopup(false)}
                className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-all text-white font-bold shadow-lg shadow-orange-600/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuPage