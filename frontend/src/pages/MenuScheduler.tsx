import { useState, useEffect } from 'react'
import { DndContext, useDraggable, useDroppable, DragEndEvent, useSensors, useSensor, MouseSensor, TouchSensor } from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { MenuItem } from '../types'
import { Search, Clock, X, GripVertical, Trash2, CalendarDays } from 'lucide-react'

// --- DRAGGABLE MENU ITEM ---
const DraggableItem = ({
  item,
  assignedSlots,
  slots,
  onAssignToSlot,
}: {
  item: MenuItem
  assignedSlots: string[]
  slots?: any[]
  onAssignToSlot?: (slotId: string, item: MenuItem) => void
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `menu-item-${item.id}`,
    data: item,
  })

  let restrictions = ''
  if (item.description && item.description.includes('|META|')) {
     try {
       const meta = JSON.parse(item.description.split('|META|')[1]);
       const days = (meta.days && meta.days.length > 0 && meta.days.length < 7) ? meta.days.join(', ') : ''
       let time = ''
       if (meta.start && meta.end) {
           const formatTo12h = (t: string) => {
              const match = t.match(/^(\d{1,2}):(\d{2})$/)
              if (match) {
                 let h = parseInt(match[1], 10)
                 const ampm = h >= 12 ? 'PM' : 'AM'
                 h = h % 12 || 12
                 return `${h}:${match[2]} ${ampm}`
              }
              return t
           }
           time = `${formatTo12h(meta.start)}-${formatTo12h(meta.end)}`
       }
       if (days && time) restrictions = `${days} • ${time}`
       else if (days) restrictions = days
       else if (time) restrictions = time
     } catch(e) {}
  }

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex flex-col gap-2.5 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-orange-500 transition-colors group"
    >
      <div className="flex items-center gap-3 w-full">
        <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
        <div className="flex-1">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.name}</h4>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
              {item.category_name}
            </span>
            {restrictions && <span className="text-[9px] text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">{restrictions}</span>}
            {assignedSlots.length > 0 ? (
              <span className="text-[9px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                In: {assignedSlots.join(', ')}
              </span>
            ) : (
              <span className="text-[9px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                Unassigned
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-bold text-orange-600 text-sm">₹{item.price}</span>
          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded mt-1 ${item.is_veg ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
            {item.is_veg ? 'VEG' : 'NON-VEG'}
          </span>
        </div>
      </div>

      {/* Alternative dropdown selection for accessibility and testing */}
      {slots && slots.length > 0 && onAssignToSlot && (
        <div className="w-full px-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <select
            value=""
            onChange={(e) => {
              const sId = e.target.value;
              if (sId) {
                onAssignToSlot(sId, item);
              }
            }}
            className="w-full text-[10px] py-1 px-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold outline-none cursor-pointer focus:ring-1 focus:ring-orange-500 transition-colors"
            data-testid={`assign-select-${item.id}`}
          >
            <option value="">+ Assign to Slot...</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.time})
              </option>
            ))}
          </select>
        </div>
      )}
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
          slot.items.map((item: MenuItem, idx: number) => {
            let restrictions = ''
            if (item.description && item.description.includes('|META|')) {
               try {
                 const meta = JSON.parse(item.description.split('|META|')[1]);
                 const days = (meta.days && meta.days.length > 0 && meta.days.length < 7) ? meta.days.join(', ') : ''
                 let time = ''
                 if (meta.start && meta.end) {
                     const formatTo12h = (t: string) => {
                        const match = t.match(/^(\d{1,2}):(\d{2})$/)
                        if (match) {
                           let h = parseInt(match[1], 10)
                           const ampm = h >= 12 ? 'PM' : 'AM'
                           h = h % 12 || 12
                           return `${h}:${match[2]} ${ampm}`
                        }
                        return t
                     }
                     time = `${formatTo12h(meta.start)}-${formatTo12h(meta.end)}`
                 }
                 if (days && time) restrictions = `${days} • ${time}`
                 else if (days) restrictions = days
                 else if (time) restrictions = time
               } catch(e) {}
            }
            return (
            <div key={`${item.id}-${idx}`} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm mt-0.5">
                  {item.is_veg ? '🥗' : '🍗'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                      {item.category_name}
                    </span>
                    {restrictions && <span className="text-[9px] text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">{restrictions}</span>}
                    {item.is_available === false && (
                      <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded">OUT OF STOCK</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveItem(slot.id, item.id)}
                className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                title="Remove from slot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )})
        )}
      </div>
    </div>
  )
}

// --- HELPERS ---
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

export default function MenuScheduler() {
  const [menuPool, setMenuPool] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [slots, setSlots] = useState<any[]>([])
  const [savedSchedule, setSavedSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'manage' | 'today'>('today')
  const [viewDay, setViewDay] = useState<string>('Today')

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  )

  const getItemsForViewDay = (slotItems: MenuItem[], slotName: string, slotTime: string) => {
    return slotItems.filter((item) => {
      let days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      let hidden: string[] = [];
      let itemStartStr = '';
      let itemEndStr = '';
      if (item.description && item.description.includes('|META|')) {
         try {
           const meta = JSON.parse(item.description.split('|META|')[1]);
           if (meta.days && meta.days.length > 0) days = meta.days;
           if (meta.hidden) hidden = meta.hidden;
           if (meta.start) itemStartStr = meta.start;
           if (meta.end) itemEndStr = meta.end;
         } catch(e) {}
      }
      
      let targetDay = viewDay;
      if (targetDay === 'Today') targetDay = today;

      if (hidden.includes(`${targetDay}_${slotName}`)) {
          return false;
      }

      // Hide the item if the times do not overlap with the slot's operating hours
      if (itemStartStr && itemEndStr && slotTime && !slotTime.toLowerCase().includes('all day')) {
          const itemStart = parseTime(itemStartStr);
          const itemEnd = parseTime(itemEndStr);
          const slotParts = slotTime.split('-');
          if (slotParts.length === 2) {
              const sStart = parseTime(slotParts[0].trim());
              const sEnd = parseTime(slotParts[1].trim());

              if (itemStart !== null && itemEnd !== null && sStart !== null && sEnd !== null) {
                  const overlaps = (itemStart >= sStart && itemStart <= sEnd) || 
                                   (itemEnd >= sStart && itemEnd <= sEnd) || 
                                   (sStart >= itemStart && sStart <= itemEnd);
                  if (!overlaps) return false;
              }
          }
      }

      if (viewDay === 'All Days') return true;
      return days.includes(targetDay);
    });
  }

  useEffect(() => {
    setLoading(true)
    // Load master menu
    const menuPromise = api.get<MenuItem[]>('/menu-items');

    // Load saved slots and settings
    const schedulePromise = api.get('/schedule');
    const settingsPromise = api.get('/settings');

    Promise.all([menuPromise, schedulePromise, settingsPromise]).then(([menuRes, scheduleRes, settingsRes]) => {
      setMenuPool(menuRes.data);
      const menuMap = new Map<number, MenuItem>(menuRes.data.map((m: MenuItem) => [m.id, m]));
      const settings = settingsRes.data;
      if (scheduleRes.data && scheduleRes.data.length > 0) {
        const updatedSlots = scheduleRes.data.map((slot: any) => {
          let sTime = slot.time;
          if (slot.name === 'Breakfast' && settings.breakfast_time) {
            sTime = settings.breakfast_time;
          }
          if (slot.name === 'Lunch' && settings.lunch_time) {
            sTime = settings.lunch_time;
          }
          if (slot.name === 'Dinner' && settings.dinner_time) {
            sTime = settings.dinner_time;
          }

          const validItems = slot.items.filter((item: MenuItem) => {
              const latestItem = menuMap.get(item.id) || item;
              let itemStartStr = '';
              let itemEndStr = '';
              if (latestItem.description && latestItem.description.includes('|META|')) {
                  try {
                      const meta = JSON.parse(latestItem.description.split('|META|')[1]);
                      if (meta.start) itemStartStr = meta.start;
                      if (meta.end) itemEndStr = meta.end;
                  } catch(e) {}
              }
              if (itemStartStr && itemEndStr && sTime && !sTime.toLowerCase().includes('all day')) {
                  const itemStart = parseTime(itemStartStr);
                  const itemEnd = parseTime(itemEndStr);
                  const slotParts = sTime.split('-');
                  if (slotParts.length === 2) {
                      const sStart = parseTime(slotParts[0].trim());
                      const sEnd = parseTime(slotParts[1].trim());

                      if (itemStart !== null && itemEnd !== null && sStart !== null && sEnd !== null) {
                          const overlaps = (itemStart >= sStart && itemStart <= sEnd) || 
                                           (itemEnd >= sStart && itemEnd <= sEnd) || 
                                           (sStart >= itemStart && sStart <= itemEnd);
                          if (!overlaps) return false;
                      }
                  }
              }
              return true;
          }).map((item: MenuItem) => menuMap.get(item.id) || item);

          return { ...slot, time: sTime, items: validItems };
        });
        setSavedSchedule(updatedSlots);
        setSlots(updatedSlots.map((s: any) => ({ ...s, items: [] })));
      } else {
        const defaultSlots = [
          { id: 'slot-1', name: 'Breakfast', time: settings.breakfast_time || '09:00 AM - 11:00 AM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] as MenuItem[] },
          { id: 'slot-2', name: 'Lunch', time: settings.lunch_time || '12:00 PM - 04:00 PM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] as MenuItem[] },
          { id: 'slot-3', name: 'Dinner', time: settings.dinner_time || '05:00 PM - 10:00 PM', activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], items: [] as MenuItem[] },
        ];
        setSavedSchedule(defaultSlots);
        setSlots(defaultSlots.map(s => ({ ...s, items: [] })));
      }
    }).catch(() => {
      toast.error("Failed to load schedule configuration.")
    }).finally(() => setLoading(false));
  }, [])

  const toggleSlotStock = async (item: MenuItem, slotName: string) => {
    if (item.is_available === false) {
         toast.error('Item is marked Out of Stock globally. Make it available in Kitchen first.');
         return;
    }

    let desc = item.description || '';
    let meta: any = { days: [], start: '', end: '', oos: [] };
    let baseDesc = desc;

    if (desc.includes('|META|')) {
       const parts = desc.split('|META|');
       baseDesc = parts[0].trim();
       try { meta = JSON.parse(parts[1]); } catch(e) {}
       if (!meta.oos) meta.oos = [];
    }

    let daysToApply = [viewDay];
    if (viewDay === 'All Days') {
        daysToApply = meta.days && meta.days.length > 0 ? meta.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    } else if (viewDay === 'Today') {
        daysToApply = [today];
    }

    let isCurrentlyOOS = false;
    if (viewDay === 'All Days') {
        isCurrentlyOOS = daysToApply.every(d => meta.oos.includes(`${d}_${slotName}`));
    } else {
        isCurrentlyOOS = meta.oos.includes(`${daysToApply[0]}_${slotName}`);
    }

    const markOOS = !isCurrentlyOOS;

    daysToApply.forEach(d => {
        const key = `${d}_${slotName}`;
        if (markOOS) {
            if (!meta.oos.includes(key)) meta.oos.push(key);
        } else {
            meta.oos = meta.oos.filter((k: string) => k !== key);
        }
    });

    const newDesc = baseDesc ? `${baseDesc} |META|${JSON.stringify(meta)}` : `|META|${JSON.stringify(meta)}`;

    try {
      await api.patch(`/menu-items/${item.id}`, { description: newDesc })
      
      const updateItem = (i: MenuItem) => i.id === item.id ? { ...i, description: newDesc } : i;
      setSavedSchedule(prev => prev.map(s => ({ ...s, items: s.items.map(updateItem) })));
      setSlots(prev => prev.map(s => ({ ...s, items: s.items.map(updateItem) })));
      setMenuPool(prev => prev.map(updateItem));

      toast.success(markOOS ? `Marked Out of Stock for ${viewDay}` : `Marked Available for ${viewDay}`);
    } catch (err) {
      toast.error('Failed to update stock status')
    }
  }

  const assignItemToSlot = async (slotId: string, draggedItem: MenuItem) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    const dbSlot = savedSchedule.find(s => s.id === slotId);

    let meta: any = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], start: '', end: '', hidden: [] };
    let baseDesc = draggedItem.description || '';
    if (draggedItem.description && draggedItem.description.includes('|META|')) {
       try { 
           const parts = draggedItem.description.split('|META|');
           baseDesc = parts[0].trim();
           meta = { ...meta, ...JSON.parse(parts[1]) }; 
           if (!meta.hidden) meta.hidden = [];
       } catch(e) {}
    }

    let isTimeValid = true;
    
    if (meta.start && meta.end) {
        const itemStart = parseTime(meta.start);
        const itemEnd = parseTime(meta.end);
        const sStart = parseTime(slot.time?.split('-')[0]?.trim() || '');
        const sEnd = parseTime(slot.time?.split('-')[1]?.trim() || '');

        if (itemStart !== null && itemEnd !== null && sStart !== null && sEnd !== null) {
            const overlaps = (itemStart >= sStart && itemStart <= sEnd) || 
                             (itemEnd >= sStart && itemEnd <= sEnd) || 
                             (sStart >= itemStart && sStart <= itemEnd);
            if (!overlaps) {
                isTimeValid = false;
            }
        }
    }

    if (!isTimeValid) {
        const dayMsg = (meta.days && meta.days.length > 0 && meta.days.length < 7) ? `${meta.days.join(', ')}` : '';
        let timeMsg = '';
        if (meta.start && meta.end) {
            const formatTo12h = (t: string) => {
                const match = t.match(/^(\d{1,2}):(\d{2})$/);
                if (match) {
                    let h = parseInt(match[1], 10);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12 || 12;
                    return `${h.toString().padStart(2, '0')}:${match[2]} ${ampm}`;
                }
                return t;
            };
            timeMsg = `${formatTo12h(meta.start)} and ${formatTo12h(meta.end)}`;
        }
        
        let errorMsg = `${draggedItem.name} is allocated for `;
        if (dayMsg && timeMsg) errorMsg += `${dayMsg} between ${timeMsg} only`;
        else if (dayMsg) errorMsg += `${dayMsg} only`;
        else if (timeMsg) errorMsg += `between ${timeMsg} only`;
        else errorMsg = `${draggedItem.name} cannot be added to this slot`;

        toast.error(errorMsg);
        return;
    }

    const isInDbSlot = dbSlot && dbSlot.items.find((i: MenuItem) => i.id === draggedItem.id);
    const slotHidden = meta.hidden.filter((h: string) => h.endsWith(`_${slot.name}`));

    if (isInDbSlot) {
        if (slotHidden.length > 0) {
            meta.hidden = meta.hidden.filter((h: string) => !h.endsWith(`_${slot.name}`));
            const newDesc = baseDesc ? `${baseDesc} |META|${JSON.stringify(meta)}` : `|META|${JSON.stringify(meta)}`;
            
            try {
                await api.patch(`/menu-items/${draggedItem.id}`, { description: newDesc });
                const updateItem = (i: MenuItem) => i.id === draggedItem.id ? { ...i, description: newDesc } : i;
                setSavedSchedule(prev => prev.map(s => s.id === dbSlot.id ? { ...s, items: s.items.map(updateItem) } : s));
                setSlots(prev => prev.map(s => s.id === dbSlot.id ? { ...s, items: s.items.map(updateItem) } : s));
                setMenuPool(prev => prev.map(updateItem));
                toast.success(`${draggedItem.name} restored to ${dbSlot.name}`);
            } catch {
                toast.error('Failed to restore');
            }
            return;
        }

        toast.error(`${draggedItem.name} is already assigned to ${dbSlot.name}`);
        return;
    }

    let updatedDraggedItem = { ...draggedItem };

    if (slotHidden.length > 0) {
        meta.hidden = meta.hidden.filter((h: string) => !h.endsWith(`_${slot.name}`));
        const newDesc = baseDesc ? `${baseDesc} |META|${JSON.stringify(meta)}` : `|META|${JSON.stringify(meta)}`;
        try {
            await api.patch(`/menu-items/${draggedItem.id}`, { description: newDesc });
            updatedDraggedItem.description = newDesc;
            const updateItem = (i: MenuItem) => i.id === draggedItem.id ? { ...i, description: newDesc } : i;
            setMenuPool(prev => prev.map(updateItem));
        } catch {
            toast.error('Failed to update item visibility');
            return;
        }
    }

    setSlots(prevSlots => prevSlots.map(s => {
      if (s.id === slotId) {
        if (s.items.find((i: MenuItem) => i.id === updatedDraggedItem.id)) {
          toast.error(`${updatedDraggedItem.name} is already in ${s.name}`)
          return s
        }
        toast.success(`Staged ${updatedDraggedItem.name} for ${s.name}`)
        return { ...s, items: [...s.items, updatedDraggedItem] }
      }
      return s
    }))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) return // Dropped outside a slot
    
    const slotId = over.id as string
    const draggedItem = active.data.current as MenuItem

    await assignItemToSlot(slotId, draggedItem)
  }

  const removeItemFromSlot = async (slotId: string, itemId: number) => {
    if (!confirm('Are you sure you want to remove this item from the slot?')) return;

    setSlots(prevSlots => prevSlots.map(slot => {
      if (slot.id === slotId) {
        return { ...slot, items: slot.items.filter((i: MenuItem) => i.id !== itemId) }
      }
      return slot
    }))

    const updatedSaved = savedSchedule.map(s => {
       if (s.id === slotId) {
          return { ...s, items: s.items.filter((i: MenuItem) => i.id !== itemId) };
       }
       return s;
    });
    setSavedSchedule(updatedSaved);
    try {
       await api.post('/schedule', { slots: updatedSaved });
       toast.success('Item removed successfully');
    } catch {
       toast.error('Failed to update database');
    }
  }



  const deleteSlot = async (slotId: string) => {
    if (confirm('Are you sure you want to delete this time slot?')) {
      const newSaved = savedSchedule.filter(s => s.id !== slotId)
      const newStaging = slots.filter(s => s.id !== slotId)
      setSavedSchedule(newSaved)
      setSlots(newStaging)
      try {
        await api.post('/schedule', { slots: newSaved })
        toast.success('Slot deleted permanently')
      } catch (err) {
        toast.error('Failed to delete in DB')
      }
    }
  }

  const saveSchedule = async () => {
    setIsSaving(true)
    try {
      const merged = savedSchedule.map(dbSlot => {
         const stageSlot = slots.find(s => s.id === dbSlot.id);
         if (stageSlot && stageSlot.items.length > 0) {
             const newItems = stageSlot.items.filter((si: MenuItem) => !dbSlot.items.some((di: MenuItem) => di.id === si.id));
             return { ...dbSlot, items: [...dbSlot.items, ...newItems] };
         }
         return dbSlot;
      });

      await api.post('/schedule', { slots: merged })
      setSavedSchedule(merged)
      setSlots(merged.map(s => ({ ...s, items: [] })))
      toast.success('Menu Schedule saved successfully!')
    } catch (err) {
      toast.error('Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  // @ts-ignore
  const _handleRemoveFromDb = async (slotId: string, item: MenuItem) => {
    const slot = savedSchedule.find(s => s.id === slotId);
    if (!slot) return;

    let targetDay = viewDay;
    if (targetDay === 'Today') targetDay = today;

    if (viewDay === 'All Days') {
        if (!confirm(`Remove ${item.name} from ${slot.name} completely?`)) return;

        const updated = savedSchedule.map(s => {
           if (s.id === slotId) {
              return { ...s, items: s.items.filter((i: MenuItem) => i.id !== item.id) };
           }
           return s;
        });
        
        setSavedSchedule(updated);
        setSlots(updated.map(s => ({ ...s, items: [] })));
        
        try {
           await api.post('/schedule', { slots: updated });
           toast.success(`${item.name} removed from ${slot.name}`);
        } catch {
           toast.error('Failed to remove');
        }
    } else {
        if (!confirm(`Remove ${item.name} from ${slot.name} on ${targetDay}?`)) return;

        let desc = item.description || '';
        let meta: any = { days: [], start: '', end: '', oos: [], hidden: [] };
        let baseDesc = desc;

        if (desc.includes('|META|')) {
           const parts = desc.split('|META|');
           baseDesc = parts[0].trim();
           try { meta = { ...meta, ...JSON.parse(parts[1]) }; } catch(e) {}
           if (!meta.hidden) meta.hidden = [];
        }
        
        const hiddenKey = `${targetDay}_${slot.name}`;
        if (!meta.hidden.includes(hiddenKey)) {
            meta.hidden.push(hiddenKey);
        }
        
        const newDesc = baseDesc ? `${baseDesc} |META|${JSON.stringify(meta)}` : `|META|${JSON.stringify(meta)}`;

        try {
           await api.patch(`/menu-items/${item.id}`, { description: newDesc });
           
           const updated = savedSchedule.map(s => {
              if (s.id === slotId) {
                  return { 
                      ...s, 
                      items: s.items.map((i: MenuItem) => i.id === item.id ? { ...i, description: newDesc } : i) 
                  };
              }
              return s;
           });

           setSavedSchedule(updated);
           setSlots(updated.map(s => ({ ...s, items: [] })));
           toast.success(`${item.name} removed from ${slot.name} on ${targetDay}`);
           setMenuPool(prev => prev.map(m => m.id === item.id ? { ...m, description: newDesc } : m));
        } catch {
           toast.error('Failed to update database');
        }
    }
  }

  const filteredMenu = menuPool.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.category_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-80px)] flex flex-col space-y-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menu Scheduler</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage slot staging or view scheduled menu.</p>
          </div>

          {/* TABS */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">

            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              View Schedule
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'manage'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Manage Schedule
            </button>
            
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'manage' && (
              <>
                {/* <button
                  onClick={addSlot}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl shadow-sm transition-all"
                >
                  + Add Custom Slot
                </button> */}
                <button
                  onClick={saveSchedule}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Save Schedule'}
                </button>
              </>
            )}
          </div>
        </div>

        {activeTab === 'manage' ? (
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
              {filteredMenu.map(item => {
                const assignedTo = savedSchedule.map(s => {
                  const isSaved = s.items.some((i: MenuItem) => i.id === item.id);
                  const isStaged = slots.find(slot => slot.id === s.id)?.items.some((i: MenuItem) => i.id === item.id);
                  return (isSaved || isStaged) ? s.name : null;
                }).filter(Boolean) as string[];

                return (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    assignedSlots={assignedTo}
                    slots={slots}
                    onAssignToSlot={assignItemToSlot}
                  />
                )
              })}
              {filteredMenu.length === 0 && (
                <div className="text-center text-slate-400 py-10 text-sm">
                  No items found. Add items in Menu Management first.
                </div>
              )}
            </div>
            
          </div>

        </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
            
            {/* Filter Header */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
               {['Today','Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <button 
                    key={day}
                    onClick={() => setViewDay(day)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${viewDay === day ? 'bg-orange-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-300'}`}
                  >
                    {day}
                  </button>
               ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedSchedule.map(slot => {
                const viewItems = getItemsForViewDay(slot.items, slot.name, slot.time);
                return (
                  <div key={slot.id} className="flex flex-col bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                          <Clock className="w-5 h-5 text-orange-600" />
                          {slot.name}
                        </h3>
                        <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600">
                          {slot.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-4 flex flex-col gap-3">
                      {viewItems.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                          No items scheduled for {viewDay.toLowerCase()}.
                        </div>
                      ) : (
                        viewItems.map((item: MenuItem) => {
                          let restrictions = ''
                          if (item.description && item.description.includes('|META|')) {
                             try {
                               const meta = JSON.parse(item.description.split('|META|')[1]);
                               const days = (meta.days && meta.days.length > 0 && meta.days.length < 7) ? meta.days.join(', ') : ''
                               let time = ''
                               if (meta.start && meta.end) {
                                   const formatTo12h = (t: string) => {
                                      const match = t.match(/^(\d{1,2}):(\d{2})$/)
                                      if (match) {
                                         let h = parseInt(match[1], 10)
                                         const ampm = h >= 12 ? 'PM' : 'AM'
                                         h = h % 12 || 12
                                         return `${h}:${match[2]} ${ampm}`
                                      }
                                      return t
                                   }
                                   time = `${formatTo12h(meta.start)} - ${formatTo12h(meta.end)}`
                               }
                               if (days && time) restrictions = `${days} • ${time}`
                               else if (days) restrictions = days
                               else if (time) restrictions = time
                             } catch(e) {}
                          }

                          const isSlotOOS = (() => {
                              if (item.is_available === false) return true;
                              if (!item.description || !item.description.includes('|META|')) return false;
                              try {
                                  const meta = JSON.parse(item.description.split('|META|')[1]);
                                  if (!meta.oos) return false;
                                  let checkDay = viewDay;
                                  if (checkDay === 'Today') checkDay = today;
                                  if (checkDay === 'All Days') {
                                      const activeDays = meta.days && meta.days.length > 0 ? meta.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                      return activeDays.every((d: string) => meta.oos.includes(`${d}_${slot.name}`));
                                  }
                                  return meta.oos.includes(`${checkDay}_${slot.name}`);
                              } catch(e) { return false; }
                          })();

                          return (
                          <div key={item.id} className="flex flex-col bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg">
                                  {item.is_veg ? '🥗' : '🍗'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded truncate max-w-full">
                                      {item.category_name}
                                    </span>
                                    {restrictions && <span className="text-[10px] text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">{restrictions}</span>}
                                    {isSlotOOS && (
                                      <span className="text-[10px] text-red-600 font-bold bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">OUT OF STOCK</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="font-black text-orange-600">₹{item.price}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <button
                                onClick={() => toggleSlotStock(item, slot.name)}
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${!isSlotOOS ? 'text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-900/20' : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'}`}
                              >
                                {!isSlotOOS ? 'Mark Out of Stock' : 'Mark Available'}
                              </button>
                              {/* <button 
                                onClick={() => handleRemoveFromDb(slot.id, item)}
                                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 dark:bg-slate-700/50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title={viewDay === 'All Days' ? `Remove from ${slot.name} completely` : `Remove from ${slot.name} on ${viewDay === 'Today' ? today : viewDay}`}
                              >
                                <X className="w-3 h-3" /> Remove
                              </button> */}
                            </div>
                          </div>
                        )})
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </DndContext>
  )
}