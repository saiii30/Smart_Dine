import React, { useState, useEffect } from 'react'
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { MenuItem } from '../types'
import { Search, Clock, X, GripVertical, Trash2 } from 'lucide-react'

// --- DRAGGABLE MENU ITEM ---
const DraggableItem = ({ item, onToggle }: { item: MenuItem, onToggle: (id: number, currentStatus: boolean) => void }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `menu-item-${item.id}`,
    data: item,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-orange-500 transition-colors group"
    >
      <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
      <div className="flex-1">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.name}</h4>
        <p className="text-xs text-slate-500">{item.category_name}</p>
        <div className="flex items-center gap-2 mt-1">
          {item.is_available === false && (
            <span className="inline-block bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded">OUT OF STOCK</span>
          )}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggle(item.id, item.is_available !== false); }}
            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded transition-colors cursor-pointer relative z-[100]"
          >
            {item.is_available !== false ? 'Mark Out of Stock' : 'Mark Available'}
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-bold text-orange-600 text-sm">₹{item.price}</span>
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 mt-1">
          {item.is_veg ? 'VEG' : 'NON-VEG'}
        </span>
      </div>
    </div>
  )
}

// --- DROPPABLE TIME SLOT ---
const DroppableSlot = ({
  slot,
  onRemoveItem,
  onDeleteSlot,
}: {
  slot: any
  onRemoveItem: (slotId: string, itemId: number) => void
  onDeleteSlot: (slotId: string) => void
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: slot.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-white dark:bg-slate-900 border-2 rounded-2xl overflow-hidden transition-colors ${
        isOver ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Slot Header */}
      <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-black text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Clock className="w-5 h-5 text-orange-600" />
            {slot.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600">
              {slot.time}
            </span>
            <button onClick={() => onDeleteSlot(slot.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Delete Slot">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slot Items */}
      <div className="flex-1 p-4 min-h-[150px] flex flex-col gap-2">
        {slot.items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            Drag items here...
          </div>
        ) : (
          slot.items.map((item: MenuItem, idx: number) => (
            <div key={`${item.id}-${idx}`} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm">
                  {item.is_veg ? '🥗' : '🍗'}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.name}</p>
                  <p className="text-[10px] text-slate-500">{item.category_name}</p>
                  {item.is_available === false && (
                    <span className="inline-block mt-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded">OUT OF STOCK</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveItem(slot.id, item.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                title="Remove from slot (e.g. if unavailable in Kitchen)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function MenuScheduler() {
  const [menuPool, setMenuPool] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Load master menu
    const menuPromise = api.get<MenuItem[]>('/menu-items').then(r => setMenuPool(r.data));

    // Load saved slots and settings
    const schedulePromise = api.get('/schedule');
    const settingsPromise = api.get('/settings');

    Promise.all([menuPromise, schedulePromise, settingsPromise]).then(([, scheduleRes, settingsRes]) => {
      const settings = settingsRes.data;
      if (scheduleRes.data && scheduleRes.data.length > 0) {
        const updatedSlots = scheduleRes.data.map((slot: any) => {
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
        setSlots(updatedSlots);
      } else {
        const defaultSlots = [
          { id: 'slot-1', name: 'Breakfast', time: settings.breakfast_time || '09:00 AM - 11:00 AM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] as MenuItem[] },
          { id: 'slot-2', name: 'Lunch', time: settings.lunch_time || '12:00 PM - 04:00 PM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] as MenuItem[] },
          { id: 'slot-3', name: 'Dinner', time: settings.dinner_time || '05:00 PM - 10:00 PM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] as MenuItem[] },
        ];
        setSlots(defaultSlots);
      }
    }).catch(() => {
      toast.error("Failed to load schedule configuration.")
    }).finally(() => setLoading(false));
  }, [])

  const toggleStock = async (id: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      await api.patch(`/menu-items/${id}`, { is_available: newStatus })
      setMenuPool(prev => prev.map(m => m.id === id ? { ...m, is_available: newStatus } : m))
      setSlots(prev => prev.map(slot => ({
        ...slot,
        items: slot.items.map((m: MenuItem) => m.id === id ? { ...m, is_available: newStatus } : m)
      })))
      toast.success(newStatus ? 'Item marked as Available' : 'Item marked Out of Stock')
    } catch (err) {
      toast.error('Failed to update stock status')
    }
  }

  const parseTime = (ts: string) => {
    if (!ts) return null;
    const match12 = ts.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
    if (match12) {
        let [, h, m, ampm] = match12
        let hours = parseInt(h, 10)
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
        return hours * 60 + parseInt(m || '0', 10)
    }
    const match24 = ts.match(/^(\d{1,2}):(\d{2})$/)
    if (match24) {
         let [, h, m] = match24
         return parseInt(h, 10) * 60 + parseInt(m, 10)
    }
    return null
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) return // Dropped outside a slot
    
    const slotId = over.id as string
    const draggedItem = active.data.current as MenuItem

    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    let meta = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], start: '', end: '' };
    if (draggedItem.description && draggedItem.description.includes('|META|')) {
       try { meta = JSON.parse(draggedItem.description.split('|META|')[1]); } catch(e) {}
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    let isDayValid = true;
    if (meta.days && meta.days.length > 0 && meta.days.length < 7) {
        if (!meta.days.includes(today)) {
            isDayValid = false;
        }
    }

    let isTimeValid = true;
    let intendedSlotName = '';
    
    if (meta.start && meta.end) {
        const itemStart = parseTime(meta.start);
        const itemEnd = parseTime(meta.end);
        const sStart = parseTime(slot.time?.split('-')[0]?.trim() || '');
        const sEnd = parseTime(slot.time?.split('-')[1]?.trim() || '');

        // Attempt to find which slot it was intended for
        const matchingSlot = slots.find(s => {
            const msStart = parseTime(s.time?.split('-')[0]?.trim() || '');
            const msEnd = parseTime(s.time?.split('-')[1]?.trim() || '');
            if (msStart === null || msEnd === null || itemStart === null || itemEnd === null) return false;
            return (itemStart >= msStart && itemStart <= msEnd) || 
                   (itemEnd >= msStart && itemEnd <= msEnd) || 
                   (msStart >= itemStart && msStart <= itemEnd);
        });
        if (matchingSlot) intendedSlotName = matchingSlot.name;

        if (itemStart !== null && itemEnd !== null && sStart !== null && sEnd !== null) {
            const overlaps = (itemStart >= sStart && itemStart <= sEnd) || 
                             (itemEnd >= sStart && itemEnd <= sEnd) || 
                             (sStart >= itemStart && sStart <= itemEnd);
            if (!overlaps) {
                isTimeValid = false;
            }
        }
    }

    if (!isDayValid || !isTimeValid) {
        const dayMsg = (meta.days && meta.days.length > 0 && meta.days.length < 7) ? `${meta.days.join(', ')}` : '';
        const slotMsg = intendedSlotName ? `${intendedSlotName}` : '';
        
        let errorMsg = `${draggedItem.name} is allocated for `;
        if (dayMsg && slotMsg) errorMsg += `${dayMsg} ${slotMsg} only`;
        else if (dayMsg) errorMsg += `${dayMsg} only`;
        else if (slotMsg) errorMsg += `${slotMsg} only`;
        else errorMsg = `${draggedItem.name} cannot be added to this slot`;

        toast.error(errorMsg);
        return;
    }

    setSlots(prevSlots => prevSlots.map(s => {
      if (s.id === slotId) {
        // Prevent duplicates in the same slot
        if (s.items.find((i: MenuItem) => i.id === draggedItem.id)) {
          toast.error(`${draggedItem.name} is already in ${s.name}`)
          return s
        }
        toast.success(`Added ${draggedItem.name} to ${s.name}`)
        return { ...s, items: [...s.items, draggedItem] }
      }
      return s
    }))
  }

  const removeItemFromSlot = (slotId: string, itemId: number) => {
    setSlots(prevSlots => prevSlots.map(slot => {
      if (slot.id === slotId) {
        return { ...slot, items: slot.items.filter((i: MenuItem) => i.id !== itemId) }
      }
      return slot
    }))
  }

  const addSlot = async () => {
    const name = prompt('Enter slot name (e.g. "Tuesday Specials" or "Friday Dinner"):')
    if (!name) return
    const time = prompt('Enter time window (e.g. "09:00 AM - 11:00 AM"):') || 'All Day'
    
    const newSlot = {
      id: `slot-${Date.now()}`,
      name,
      time,
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      items: []
    }
    const newSlots = [...slots, newSlot]
    setSlots(newSlots)
    
    try {
      await api.post('/schedule', { slots: newSlots })
      toast.success('Custom slot created')
    } catch (err) {
      toast.error('Failed to save to DB')
    }
  }

  const deleteSlot = async (slotId: string) => {
    if (confirm('Are you sure you want to delete this time slot?')) {
      const newSlots = slots.filter(s => s.id !== slotId)
      setSlots(newSlots)
      try {
        await api.post('/schedule', { slots: newSlots })
        toast.success('Slot deleted permanently')
      } catch (err) {
        toast.error('Failed to delete in DB')
      }
    }
  }

  const saveSchedule = async () => {
    setIsSaving(true)
    try {
      await api.post('/schedule', { slots })
      toast.success('Menu Schedule saved successfully!')
    } catch (err) {
      toast.error('Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredMenu = menuPool.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.category_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-80px)] flex flex-col space-y-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menu Scheduler</h1>
            <p className="text-slate-500 mt-1 text-sm">Drag items to time slots.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addSlot}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl shadow-sm transition-all"
            >
              + Add Custom Slot
            </button>
            <button
              onClick={saveSchedule}
              disabled={isSaving}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-70"
            >
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* LEFT/CENTER: Time Slots */}
          <div className="flex-[2] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500">Loading schedule...</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 pb-10">
                {slots.map(slot => (
                  <DroppableSlot 
                    key={slot.id} 
                    slot={slot} 
                    onRemoveItem={removeItemFromSlot} 
                    onDeleteSlot={deleteSlot}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Menu Pool */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col min-h-0 overflow-hidden shadow-sm">
            
            {/* Search Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <h3 className="font-bold text-lg mb-3 flex items-center justify-between">
                Master Menu Pool
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-md">{filteredMenu.length} Items</span>
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items to drag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
                />
              </div>
            </div>

            {/* Draggable Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredMenu.map(item => (
                <DraggableItem key={item.id} item={item} onToggle={toggleStock} />
              ))}
              {filteredMenu.length === 0 && (
                <div className="text-center text-slate-400 py-10 text-sm">
                  No items found. Add items in Menu Management first.
                </div>
              )}
            </div>
            
          </div>

        </div>
      </div>

    </DndContext>
  )
}