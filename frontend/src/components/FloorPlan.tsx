import React, { useState, useEffect } from 'react'
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core'
import toast from 'react-hot-toast'
import { api } from '../api/api'

// Use a flexible type to accommodate our new shape/dimension properties
type FloorPlanTable = any

interface FloorPlanProps {
  tables: FloorPlanTable[]
  waiters: any[]
  activeOrders?: any[]
  onUpdate: () => void
  onDeleteTable: (id: number) => void
  onAddTable: (shape: string) => void
  userRole?: string
  onAddMenu?: (id: number, seatCount?: number, seatName?: string) => void
  onSeatCustomer?: (id: number, seatCount?: number, seatName?: string) => void
}

const VisualTable = ({
  table,
  allTables,
  waiters,
  activeOrders,
  onUpdateCapacity,
  onAssignWaiter,
  onDeleteTable,
  onMergeTables,
  onSplitTable,
  userRole,
  onAddMenu,
  onSeatCustomer,
}: {
  table: FloorPlanTable
  allTables: FloorPlanTable[]
  waiters: any[]
  activeOrders?: any[]
  onUpdateCapacity: (id: number, delta: number) => void
  onAssignWaiter: (id: number, waiterId: string) => void
  onDeleteTable: (id: number) => void
  onMergeTables: (sourceId: number, targetId: number) => void
  onSplitTable: (id: number) => void
  userRole?: string
  onAddMenu?: (id: number, seatCount?: number, seatName?: string) => void
  onSeatCustomer?: (id: number, seatCount?: number, seatName?: string) => void
}) => {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const isStaff = userRole === 'WAITER' || userRole === 'KITCHEN'
  const canPlaceOrder = userRole === 'WAITER' || userRole === 'MANAGER' || userRole === 'CASHIER'
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id.toString(),
  })

  const shape = table.shape || 'rectangle'
  const width = table.width || 100
  const height = table.height || 100
  const cap = table.capacity || 2

  // Dynamically resolve waiter name on page refresh
  const assignedWaiter = waiters.find(w => String(w.user_id) === String(table.waiter_id))
  const displayWaiterName = table.waiter_name || assignedWaiter?.full_name

  // Compute occupied seats
  const tableOrders = activeOrders?.filter((o: any) => o.table_id === table.id) || []
  const occupied = new Set<number>()
  let isFullTable = false
  tableOrders.forEach((o: any) => {
    if (!o.customer_name?.startsWith('Seat')) isFullTable = true
    else {
      const match = o.customer_name.match(/\d+/g)
      if (match) match.forEach((m: string) => occupied.add(parseInt(m, 10) - 1))
    }
  })
  if (isFullTable) {
    for (let i = 0; i < cap; i++) occupied.add(i)
  }

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

      const isOccupied = occupied.has(i)
      let baseFill = "#1e293b"
      let topFill = "#334155"
      
      if (selectedSeats.includes(i)) {
        baseFill = "#ea580c"
        topFill = "#fb923c"
      } else if (isOccupied) {
        baseFill = "#047857"
        topFill = "#10b981"
      }

      chairs.push(
        <div
          key={`chair-${i}`}
className={`absolute w-9 h-9 flex items-center justify-center transition-transform duration-300 drop-shadow-[0_6px_6px_rgba(0,0,0,0.5)] z-20 group/chair pointer-events-auto ${
  userRole === 'WAITER' ? 'cursor-pointer' : 'cursor-default'
}`}
          style={{ top: chairY, left: chairX, transform: `rotate(${rotate}deg)` }}
          title={`Seat ${i + 1}${isOccupied ? ' (Occupied)' : ''}`}
          onClick={(e) => {
  e.stopPropagation()

  // Only waiter can select seats
  if (userRole !== 'WAITER') return

  setSelectedSeats(prev =>
    prev.includes(i)
      ? prev.filter(idx => idx !== i)
      : [...prev, i].sort((a, b) => a - b)
  )
}}
        >
          {/* Elegant SVG Top-Down Chair Icon */}
          <svg viewBox="0 0 64 64" className="w-full h-full overflow-visible pointer-events-none transition-colors duration-200">
            <rect x="10" y="4" width="44" height="18" rx="9" fill={baseFill} stroke="#0f172a" strokeWidth="2" />
            <rect x="14" y="16" width="36" height="38" rx="8" fill={topFill} stroke="#1e293b" strokeWidth="2" />
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

    const isTargetOccupied = activeOrders?.some((o: any) => o.table_id === target.id)
    if (occupied.size > 0 || isTargetOccupied) {
      toast.error("Cannot merge occupied tables! Finish active orders first.")
      return
    }

    if (confirm(`Merge Table ${target.table_number} into Table ${table.table_number}?\nThis combines seats and deletes the old table.`)) {
      onMergeTables(table.id, target.id)
    }
  }

  return (
    <div ref={setNodeRef} style={style} tabIndex={0} className={`group z-10 hover:z-30 focus:z-30 outline-none cursor-grab active:cursor-grabbing`}>
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
        {occupied.size > 0 && (
          <span className="text-[10px] font-bold text-emerald-100 bg-emerald-600/90 px-2 py-0.5 rounded-md mt-1 mb-0.5 shadow-sm uppercase tracking-wider">
            {occupied.size}/{cap} OCCUPIED
          </span>
        )}
      {displayWaiterName ? (
        <span className="text-[9px] font-bold text-amber-900 bg-amber-400 px-2 py-0.5 rounded-md mt-1 shadow-sm uppercase tracking-wider">👤 {displayWaiterName.split(' ')[0]}</span>
          ) : (
            <span className="text-[9px] font-bold text-red-100 bg-red-500/90 px-2 py-0.5 rounded-md mt-1 shadow-sm uppercase tracking-wider">Unassigned</span>
          )}
        </div>
      </div>

      {/* Chairs mapping */}
      <div className="absolute inset-0 pointer-events-none">{renderChairs()}</div>

      {/* Hover Controls */}
      <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 focus-within:opacity-100 transition-all duration-300 absolute bottom-full mb-16 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-4 gap-3 text-sm flex flex-col items-center pointer-events-auto border border-white/10 min-w-[220px] z-[100] transform scale-95 group-hover:scale-100 group-focus:scale-100 focus-within:scale-100">
        
        {canPlaceOrder && tableOrders.length > 0 && (
          <div className="w-full space-y-1.5 bg-slate-800/80 p-2 rounded-xl border border-white/5 shadow-inner">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Active Groups</label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {tableOrders.map((o: any) => (
                <div key={o.id} className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-white/5">
                  <div className="flex flex-col max-w-[110px]">
                    <span className="text-xs font-bold text-emerald-400 truncate" title={o.customer_name || 'Full Table'}>
                      {o.customer_name || 'Full Table'}
                    </span>
                    <span className="text-[10px] text-slate-400">{o.seat_count} {o.seat_count > 1 ? 'Seats' : 'Seat'}</span>
                  </div>
                  <button 
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddMenu?.(table.id, o.seat_count, o.customer_name || 'Full Table');
                    }}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isStaff && (
          <>
        
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
              {waiters.map(w => <option key={w.id} value={w.user_id}>{w.full_name}</option>)}
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
          </>
        )}
        {/* {canPlaceOrder && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (selectedSeats.length > 0) {
                onAddMenu?.(table.id, selectedSeats.length, `Seat ${selectedSeats.map(i => i + 1).join(', ')}`);
                setSelectedSeats([]);
              } else {
                onAddMenu?.(table.id, undefined, 'Full Table'); 
              }
            }}
            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            {selectedSeats.length > 0 ? `New Order (${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''})` : 'New Order (Full Table)'}
          </button>
        )} */}
        {userRole === 'WAITER' && (
        <>
          {cap > occupied.size && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (selectedSeats.length > 0) {
                  onSeatCustomer?.(table.id, selectedSeats.length, `Seat ${selectedSeats.map(i => i + 1).join(', ')}`);
                  setSelectedSeats([]);
                } else {
                  onSeatCustomer?.(table.id, cap - occupied.size, 'Full Table'); 
                }
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              {selectedSeats.length > 0 ? `Seat Customer (${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''})` : 'Seat Customer'}
            </button>
          )}
        </>
        )}
      </div>
    </div>
  )
}

export default function FloorPlan({
  tables,
  waiters,
  activeOrders,
  onUpdate,
  onDeleteTable,
  onAddTable,
  userRole,
  onAddMenu,
  onSeatCustomer,
}: FloorPlanProps) {
  const [localTables, setLocalTables] = useState<FloorPlanTable[]>(tables)
  const [mergePrompt, setMergePrompt] = useState<{
    deletedTableId: number
    keptTableId: number
    deletedTableName: string
    keptTableName: string
    revertX: number
    revertY: number
  } | null>(null)

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

    // Check for collisions/proximity with other tables for merging
    let nearbyTable = null
    for (const other of localTables) {
      if (other.id === id) continue
      const rect1 = { x: newX, y: newY, w: table.width || 100, h: table.height || 100 }
      const rect2 = { x: other.pos_x || 0, y: other.pos_y || 0, w: other.width || 100, h: other.height || 100 }
      
      // Add a small threshold to make merging easier when they are close
      const threshold = 20
      const isOverlapping =
        rect1.x < rect2.x + rect2.w + threshold &&
        rect1.x + rect1.w + threshold > rect2.x &&
        rect1.y < rect2.y + rect2.h + threshold &&
        rect1.y + rect1.h + threshold > rect2.y

      if (isOverlapping) {
        nearbyTable = other
        break
      }
    }

    if (nearbyTable) {
      const isSourceOccupied = activeOrders?.some((o: any) => o.table_id === table.id)
      const isTargetOccupied = activeOrders?.some((o: any) => o.table_id === nearbyTable.id)
      
      if (isSourceOccupied || isTargetOccupied) {
        toast.error("Cannot merge occupied tables! Finish active orders first.")
        setLocalTables((prev) => prev.map((t) => (t.id === id ? { ...t, pos_x: table.pos_x || 0, pos_y: table.pos_y || 0 } : t)))
        return
      }

      setMergePrompt({
        deletedTableId: table.id,
        keptTableId: nearbyTable.id,
        deletedTableName: table.table_number,
        keptTableName: nearbyTable.table_number,
        revertX: table.pos_x || 0,
        revertY: table.pos_y || 0
      })
      setLocalTables((prev) => prev.map((t) => (t.id === id ? { ...t, pos_x: newX, pos_y: newY } : t)))
      return
    }

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

    const active = activeOrders?.filter((o: any) => o.table_id === id) || []
    if (active.length > 0) {
      const confirmed = window.confirm('Splitting this table will cancel its active orders to free both tables. Continue?')
      if (!confirmed) return
    }

    if (table.merge_history) {
      const hist = table.merge_history
      
      try {
        // Free the table: Cancel any active orders on it
        if (active.length > 0) {
          await Promise.all(
            active.map((o: any) => 
              api.patch(`/orders/${o.id}/status`, null, { params: { status: 'cancelled' } })
            )
          )
        }

        // Restore original source table properties
        await api.patch(`/tables/${id}`, { 
          capacity: hist.source_original.capacity, 
          width: hist.source_original.width, 
          height: hist.source_original.height,
          shape: hist.source_original.shape,
          is_merged: false,
          merge_history: null,
          status: 'available',
          waiter_id: null
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
          is_merged: false,
          status: 'available',
          waiter_id: null
        })
        
        toast.success('Tables split and freed successfully')
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
  // Find waiter name
  const waiter = waiters.find(
    (w) => String(w.user_id) === String(waiterId)
  )

  // Backup old state
  const oldTables = [...localTables]

  // Instant local update without full rerender
  setLocalTables((prev) =>
    prev.map((t) =>
      t.id === id
        ? {
            ...t,
            waiter_id: waiterId === '' ? null : waiterId,
            waiter_name: waiterId === '' ? null : waiter?.full_name || null,
          }
        : t
    )
  )

  try {
    await api.patch(`/tables/${id}`, {
      waiter_id: waiterId === '' ? null : waiterId,
    })

    toast.success('Waiter assigned')
  } catch {
    // rollback if API fails
    setLocalTables(oldTables)
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
            <VisualTable key={table.id} table={table} allTables={localTables} waiters={waiters} activeOrders={activeOrders} onUpdateCapacity={updateCapacity} onAssignWaiter={assignWaiter} onDeleteTable={onDeleteTable} onMergeTables={mergeTables} onSplitTable={splitTable} userRole={userRole} onAddMenu={onAddMenu} onSeatCustomer={onSeatCustomer} />
          ))}
        </DndContext>
      </div>

      {/* Custom Merge Confirmation Modal */}
      {mergePrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
              Merge Tables?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              You are about to merge <strong className="text-slate-800 dark:text-slate-200">Table {mergePrompt.deletedTableName}</strong> into <strong className="text-slate-800 dark:text-slate-200">Table {mergePrompt.keptTableName}</strong>. This will combine their seats and permanently remove Table {mergePrompt.deletedTableName}.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => {
                  setLocalTables((prev) => prev.map((t) => (t.id === mergePrompt.deletedTableId ? { ...t, pos_x: mergePrompt.revertX, pos_y: mergePrompt.revertY } : t)))
                  setMergePrompt(null)
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await mergeTables(mergePrompt.keptTableId, mergePrompt.deletedTableId)
                  setMergePrompt(null)
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg transition-colors"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}