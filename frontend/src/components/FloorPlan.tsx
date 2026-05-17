import React, { useState, useEffect } from 'react'
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { api } from '../api/api'

// Use a flexible type to accommodate our new shape/dimension properties
type FloorPlanTable = any

interface FloorPlanProps {
  tables: FloorPlanTable[]
  waiters: any[]
  onUpdate: () => void
  onDeleteTable: (id: number) => void
  onAddTable: (shape: string) => void
  userRole?: string
}

const VisualTable = ({
  table,
  allTables,
  waiters,
  onUpdateCapacity,
  onAssignWaiter,
  onDeleteTable,
  onMergeTables,
  onSplitTable,
  userRole,
}: {
  table: FloorPlanTable
  allTables: FloorPlanTable[]
  waiters: any[]
  onUpdateCapacity: (id: number, delta: number) => void
  onAssignWaiter: (id: number, waiterId: string) => void
  onDeleteTable: (id: number) => void
  onMergeTables: (sourceId: number, targetId: number) => void
  onSplitTable: (id: number) => void
  userRole?: string
}) => {
  const isStaff = userRole === 'WAITER' || userRole === 'KITCHEN'
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id.toString(),
    disabled: isStaff, // Prevent Waiters from dragging tables
  })

  const shape = table.shape || 'rectangle'
  const width = table.width || 100
  const height = table.height || 100
  const cap = table.capacity || 2

  const style = {
    position: 'absolute' as const,
    top: table.pos_y || 0,
    left: table.pos_x || 0,
    width,
    height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  }

  const renderChairs = () => {
    const chairs = []
    for (let i = 0; i < cap; i++) {
      let chairX = 0
      let chairY = 0
      let rotate = 0

      if (shape === 'circle') {
        const angle = (i / cap) * (2 * Math.PI)
        const radius = width / 2 + 28 // Increased spacing
        chairX = width / 2 + radius * Math.cos(angle) - 18 // Center 36px width chair
        chairY = height / 2 + radius * Math.sin(angle) - 18 // Center 36px height chair
        // Rotate chair so backrest faces outwards
        rotate = (angle * 180) / Math.PI + 90
      } else {
        // Distribute top and bottom along the edge
        const spacing = width / Math.ceil(cap / 2)
        const isTop = i % 2 === 0
        chairX = Math.floor(i / 2) * spacing + spacing / 2 - 18
        chairY = isTop ? -38 : height + 10 // Increased spacing
        rotate = isTop ? 0 : 180
      }

      chairs.push(
        <div
          key={`chair-${i}`}
          className="absolute w-9 h-9 flex items-center justify-center transition-transform duration-300 drop-shadow-[0_6px_6px_rgba(0,0,0,0.5)] z-0"
          style={{ top: chairY, left: chairX, transform: `rotate(${rotate}deg)` }}
          title="Chair"
        >
          {/* Elegant SVG Top-Down Chair Icon */}
          <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible">
            <rect x="10" y="4" width="44" height="18" rx="9" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
            <rect x="14" y="16" width="36" height="38" rx="8" fill="#334155" stroke="#1e293b" strokeWidth="2" />
          </svg>
        </div>
      )
    }
    return chairs
  }

  const handleMerge = () => {
    const tNum = prompt("Enter Table Number to merge WITH this one (e.g. T2):")
    if (!tNum) return
    
    // Clean inputs to handle both "T2" and "2" interchangeably
    const cleanInput = tNum.replace(/^t/i, '').trim()
    const target = allTables.find(t => t.table_number.replace(/^t/i, '').trim() === cleanInput)
    
    if (!target) {
      toast.error("Table not found")
      return
    }
    if (target.id === table.id) {
      toast.error("Cannot merge table with itself")
      return
    }
    if (confirm(`Merge Table ${target.table_number} into Table ${table.table_number}?\nThis combines seats and deletes the old table.`)) {
      onMergeTables(table.id, target.id)
    }
  }

  return (
    <div ref={setNodeRef} style={style} tabIndex={0} className="group cursor-grab active:cursor-grabbing z-10 hover:z-30 focus:z-30 outline-none">
      {/* Table Surface */}
      <div
        {...listeners}
        {...attributes}
        className={`w-full h-full relative transition-all duration-300 group-hover:scale-[1.02] flex items-center justify-center z-10
          ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}
        `}
        style={{
          background: 'linear-gradient(135deg, #b86b25 0%, #613008 100%)',
          boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.25), inset 0 -5px 10px rgba(0,0,0,0.6), 0 20px 30px rgba(0,0,0,0.5)',
          border: '1px solid #4a2508',
        }}
      >
        {/* Wood grain texture overlay */}
        <div className={`absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}`} 
             style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, #000 6px, #000 7px)' }} />
             
        {/* Modern Centerpiece / Plant */}
        <div className="absolute w-10 h-10 rounded-full border-2 border-black/20 bg-black/15 flex items-center justify-center shadow-inner pointer-events-none">
          <div className="w-5 h-5 bg-emerald-600/90 rounded-full blur-[1px] shadow-lg" />
          <div className="absolute w-2.5 h-2.5 bg-rose-500/80 rounded-full top-1.5 left-2 blur-[0.5px]" />
        </div>

        {/* Glassmorphism Nametag */}
        <div className="flex flex-col items-center pointer-events-none z-10 bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10 shadow-xl">
          <span className="font-black text-amber-50 text-xl tracking-widest drop-shadow-md">T{table.table_number}</span>
          {table.waiter_name ? (
            <span className="text-[9px] font-bold text-amber-900 bg-amber-400 px-2 py-0.5 rounded-md mt-1 shadow-sm uppercase tracking-wider">👤 {table.waiter_name.split(' ')[0]}</span>
          ) : (
            <span className="text-[9px] font-bold text-red-100 bg-red-500/90 px-2 py-0.5 rounded-md mt-1 shadow-sm uppercase tracking-wider">Unassigned</span>
          )}
        </div>
      </div>

      {/* Chairs mapping */}
      <div className="absolute inset-0 pointer-events-none">{renderChairs()}</div>

      {/* Hover Controls */}
      {!isStaff && (
        <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 focus-within:opacity-100 transition-all duration-300 absolute -top-[165px] left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-4 gap-3 text-sm flex flex-col items-center pointer-events-auto border border-white/10 min-w-[220px] z-[100] transform scale-95 group-hover:scale-100 group-focus:scale-100 focus-within:scale-100">
        
        <div className="flex items-center justify-between w-full bg-slate-800/80 p-1.5 rounded-xl border border-white/5 shadow-inner">
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateCapacity(table.id, -1) }}
            className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors active:scale-95"
            disabled={cap <= 1}
          >
            -
          </button>
          <span className="whitespace-nowrap font-bold text-slate-200 text-xs tracking-widest">{cap} SEATS</span>
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateCapacity(table.id, 1) }}
            className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors active:scale-95"
          >
            +
          </button>
        </div>
        
        <div className="w-full space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Assign Waiter</label>
          {waiters && waiters.length > 0 ? (
            <select 
              value={table.waiter_id || ''} 
              onChange={(e) => onAssignWaiter(table.id, e.target.value)}
              className="w-full text-xs p-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-200 font-medium cursor-pointer focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
            >
              <option value="">No Waiter</option>
              {waiters.map(w => <option key={w.user_id} value={w.user_id}>{w.full_name}</option>)}
            </select>
          ) : (
            <div className="text-[10px] text-red-300 bg-red-900/30 p-2 rounded-lg text-center font-medium border border-red-500/30">
              No Waiters Found
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 w-full gap-2 mt-2 pt-3 border-t border-white/10">
          <button onClick={(e) => { e.stopPropagation(); handleMerge(); }} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors group/btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:scale-110 transition-transform"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Merge
          </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (table.is_merged) onSplitTable(table.id); 
                else toast.error("Only merged tables can be split!"); 
              }} 
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors group/btn ${table.is_merged ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300' : 'text-slate-600 cursor-not-allowed opacity-50'}`}
            >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:scale-110 transition-transform"><path d="M12 8v8"/><path d="M8 12l4 4 4-4"/><path d="M5 4h14"/></svg>
            Split
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteTable(table.id); }} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors group/btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:scale-110 transition-transform"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
        </div>
      )}
    </div>
  )
}

export default function FloorPlan({
  tables,
  waiters,
  onUpdate,
  onDeleteTable,
  onAddTable,
  userRole,
}: FloorPlanProps) {
  const [localTables, setLocalTables] = useState<FloorPlanTable[]>(tables)

  useEffect(() => {
    setLocalTables(tables)
  }, [tables])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event
    if (delta.x === 0 && delta.y === 0) return

    const id = Number(active.id)
    const table = localTables.find((t) => t.id === id)
    if (!table) return

    const newX = Math.max(0, (table.pos_x || 0) + delta.x)
    const newY = Math.max(0, (table.pos_y || 0) + delta.y)

    setLocalTables((prev) => prev.map((t) => (t.id === id ? { ...t, pos_x: newX, pos_y: newY } : t)))

    try {
      await api.patch(`/tables/${id}`, { pos_x: newX, pos_y: newY })
    } catch {
      toast.error('Failed to save table layout position')
      onUpdate() // revert local changes on failure
    }
  }

  const updateCapacity = async (id: number, delta: number) => {
  const oldTables = [...localTables]

  const table = localTables.find((t) => t.id === id)

  if (!table) return

  const newCap = Math.max(1, table.capacity + delta)

  // Instant UI update
  setLocalTables((prev) =>
    prev.map((t) =>
      t.id === id
        ? {
            ...t,
            capacity: newCap,
          }
        : t
    )
  )

  try {
    await api.patch(`/tables/${id}`, {
      capacity: newCap,
    })
  } catch {
    toast.error('Failed to update chairs')

    // rollback
    setLocalTables(oldTables)
  }
}
  const mergeTables = async (sourceId: number, targetId: number) => {
    const source = localTables.find((t) => t.id === sourceId)
    const target = localTables.find((t) => t.id === targetId)
    if (!source || !target) return

    const newCap = source.capacity + target.capacity
    // Merge visually by making the table longer to accommodate new seats
    const newWidth = source.shape === 'circle' ? 140 : source.width + 60
    
    const historyData = {
      source_original: {
        capacity: source.capacity,
        width: source.width,
        height: source.height,
        shape: source.shape,
      },
      target_original: {
        table_number: target.table_number,
        capacity: target.capacity,
        width: target.width,
        height: target.height,
        shape: target.shape,
      }
    }

    try {
      await api.patch(`/tables/${sourceId}`, { capacity: newCap, width: newWidth, shape: 'rectangle', is_merged: true, merge_history: historyData })
      await api.delete(`/tables/${targetId}`)
      toast.success(`Merged Table ${target.table_number} into ${source.table_number}`)
      onUpdate()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.status === 400 || err.response?.status === 409 ? 'Cannot delete the merged table (it may have active orders).' : 'Failed to merge tables')
    }
  }

  const splitTable = async (id: number) => {
    const table = localTables.find((t) => t.id === id)
    if (!table) return
    if (!table.is_merged) {
      toast.error('Only merged tables can be split')
      return
    }

    if (table.merge_history) {
      const hist = table.merge_history
      
      try {
        // Restore original source table properties
        await api.patch(`/tables/${id}`, { 
          capacity: hist.source_original.capacity, 
          width: hist.source_original.width, 
          height: hist.source_original.height,
          shape: hist.source_original.shape,
          is_merged: false,
          merge_history: null
        })
        
        // Recreate the deleted target table with its original properties
        await api.post('/tables', {
          table_number: hist.target_original.table_number,
          shape: hist.target_original.shape,
          width: hist.target_original.width,
          height: hist.target_original.height,
          capacity: hist.target_original.capacity,
          pos_x: (table.pos_x || 0) + hist.source_original.width + 40,
          pos_y: table.pos_y || 0,
          zone: table.zone,
          branch_id: table.branch_id,
          is_merged: false
        })
        
        toast.success('Table split successfully')
        onUpdate()
      } catch (err) {
        console.error("Split table error:", err)
        toast.error('Failed to split table')
      }
    } else {
      toast.error('Cannot split: original table history is missing')
    }
  }

  const assignWaiter = async (id: number, waiterId: string) => {
    try {
      await api.patch(`/tables/${id}`, { waiter_id: waiterId === '' ? null : waiterId })
      toast.success('Waiter assigned')
      onUpdate()
    } catch {
      toast.error('Failed to assign waiter')
    }
  }

  // const addTable = async (shape: string) => {
  //   const count = tables.length + 1;
  //   const tNum = prompt("Enter Table Number:", `T${count}`);
  //   if (!tNum) return;
    
  //   try {
  //     await api.post('/tables', {
  //       table_number: tNum,
  //       shape,
  //       width: shape === 'rectangle' ? 140 : 100,
  //       height: shape === 'rectangle' ? 80 : 100,
  //       capacity: shape === 'circle' ? 4 : (shape === 'rectangle' ? 6 : 4),
  //       pos_x: 50,
  //       pos_y: 50
  //     });
  //     toast.success('Table Added');
  //     onUpdate();
  //   } catch {
  //     toast.error('Failed to add table');
  //   }
  // }

  return (
    <div className="relative w-full h-[500px] md:h-[700px] min-w-[320px] overflow-auto touch-pan-x touch-pan-y bg-[#e2e8f0] dark:bg-[#0f172a] rounded-3xl mt-6 shadow-[inset_0_0_80px_rgba(0,0,0,0.15)] border-4 border-slate-300 dark:border-slate-800">
      {/* Blueprint Grid Pattern */}
      <div className="absolute min-w-[800px] min-h-[700px] inset-0 opacity-[0.05] dark:opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px)', backgroundSize: '60px 60px' }} />

      {/* Bottom Tool Bar - Add Tables Without Form
      {userRole !== 'WAITER' && userRole !== 'KITCHEN' && (
        <div className="fixed sm:absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 sm:gap-3 bg-white/95 backdrop-blur dark:bg-slate-900/95 p-2 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-700 z-[100] w-[90%] sm:w-auto">
          <button onClick={() => onAddTable('circle')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-transform active:scale-95"><div className="w-4 h-4 rounded-full border-2 border-slate-400"></div> Circle</button>
          <button onClick={() => onAddTable('square')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-transform active:scale-95"><div className="w-4 h-4 rounded-sm border-2 border-slate-400"></div> Square</button>
          <button onClick={() => onAddTable('rectangle')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-transform active:scale-95"><div className="w-5 h-3 rounded-sm border-2 border-slate-400"></div> Rectangle</button>
        </div>
      )} */}

      <div className="min-w-[800px] min-h-[700px] relative">
        <DndContext onDragEnd={handleDragEnd}>
          {localTables.map((table) => (
            <VisualTable key={table.id} table={table} allTables={localTables} waiters={waiters} onUpdateCapacity={updateCapacity} onAssignWaiter={assignWaiter} onDeleteTable={onDeleteTable} onMergeTables={mergeTables} onSplitTable={splitTable} userRole={userRole} />
          ))}
        </DndContext>
      </div>
    </div>
  )
}