import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  MapPin,
  Layers,
  UserCircle,
  Armchair,
  LayoutGrid,
  Map,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable, Order } from '../types'
import FloorPlan from '../components/FloorPlan'
import { useAuth } from '../contexts/AuthContext'
import { useOrderSocket } from '../hooks/useOrderSocket'

const Tables = () => {
  const { user } = useAuth()
  const isStaff = user?.role === 'WAITER' || user?.role === 'KITCHEN'
  const canPlaceOrder = user?.role === 'WAITER' || user?.role === 'MANAGER' || user?.role === 'CASHIER'
  const navigate = useNavigate()
  const [rows, setRows] = useState<DiningTable[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [waiters, setWaiters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTableModal, setShowTableModal] = useState(false)
  const [selectedShape, setSelectedShape] = useState('')
  const [tableName, setTableName] = useState('')
  const [view, setView] = useState<'grid' | 'floor'>('floor')
  const [selectedSeatsMap, setSelectedSeatsMap] = useState<Record<number, number[]>>({})

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true)
    Promise.all([
      api.get<DiningTable[]>('/tables'),
      api.get<Order[]>('/orders')
    ])
      .then(([tRes, oRes]) => {
        let allTables = tRes.data
        const active = oRes.data.filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
        
        if (user?.role === 'WAITER') {
          const myTableIds = new Set([
            ...allTables.filter((t: any) => 
              (user?.id && String(t.waiter_id) === String(user.id)) || 
              (user?.full_name && t.waiter_name === user.full_name)
            ).map(t => t.id),
            ...active.map(o => o.table_id)
          ])
          allTables = allTables.filter(t => myTableIds.has(t.id))
        }
        
        setRows(allTables)
        setActiveOrders(active)
      })
      .finally(() => {
        if (!quiet) setLoading(false)
      })
  }, [user?.role, user?.id, user?.full_name])

  const loadWaiters = useCallback(async () => {
    try {
      const { data } = await api.get('/employees')
      setWaiters(data.filter((e: any) => e.role === 'WAITER' && e.user_id))
    } catch {
      // Not admin/manager, ignore gracefully
    }
  }, [])

  useEffect(() => {
    load()
    loadWaiters()
  }, [load, loadWaiters])

  useOrderSocket(() => {
    load(true)
  })

  const deleteTable = async (id: number) => {
    if (!confirm('Delete this table?')) return
    try {
      await api.delete(`/tables/${id}`)
      toast.success('Deleted')
      load()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Cannot delete table. It has existing orders associated with it.')
      } else {
        toast.error('Failed to delete table')
      }
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-slate-500 animate-pulse">
        Loading tables...
      </div>
    )
  }

  const stats = [
    { title: 'Total Tables', value: rows.length, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { title: 'Total Capacity', value: rows.reduce((acc, t) => acc + t.capacity, 0), icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { title: 'Active Zones', value: new Set(rows.map(t => t.zone)).size, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { title: 'Waiters Staff', value: waiters.length, icon: UserCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ]

  const addTable = async () => {
  if (!tableName.trim()) {
    toast.error('Enter table name')
    return
  }

  try {
    await api.post('/tables', {
      table_number: tableName,
      shape: selectedShape,
      width: selectedShape === 'rectangle' ? 140 : 100,
      height: selectedShape === 'rectangle' ? 80 : 100,
      capacity:
        selectedShape === 'circle'
          ? 4
          : selectedShape === 'rectangle'
          ? 6
          : 4,
      pos_x: 50,
      pos_y: 50,
    })

    toast.success('Table Added')

    setShowTableModal(false)
    setTableName('')
    setSelectedShape('')

    load()
  } catch {
    toast.error('Failed to add table')
  }
}

const openTableModal = (shape: string) => {
  setSelectedShape(shape)
  setTableName(`T${rows.length + 1}`)
  setShowTableModal(true)
}

const handleAddMenu = (tableId: number, seatCount?: number, seatName?: string) => {
  navigate('/orders', { state: { openNewOrderForTable: tableId, seatCount, seatName }, preventScrollReset: true })
}

const handleSeatCustomer = async (tableId: number, seatCount?: number, seatName?: string) => {
  try {
    await api.post('/orders/seat', {
      table_id: tableId,
      seat_count: seatCount || 1,
      customer_name: seatName === 'Full Table' ? undefined : seatName,
    })
    toast.success('Customer seated successfully')
    load(true)
  } catch (err: any) {
    toast.error(err.response?.data?.detail || 'Failed to seat customer')
  }
}

  const updateCapacity = async (id: number, delta: number) => {
    const table = rows.find((t) => t.id === id)
    if (!table) return
    const newCap = Math.max(1, table.capacity + delta)
    try {
      await api.patch(`/tables/${id}`, { capacity: newCap })
      load(true)
    } catch {
      toast.error('Failed to update capacity')
    }
  }

  const assignWaiter = async (id: number, waiterId: string) => {
    try {
      await api.patch(`/tables/${id}`, { waiter_id: waiterId === '' ? null : waiterId })
      toast.success('Waiter assigned')
      load(true)
    } catch {
      toast.error('Failed to assign waiter')
    }
  }

  const handleMerge = async (table: DiningTable) => {
    const tNum = prompt("Enter Table Number to merge WITH this one (e.g. T2):")
    if (!tNum) return
    
    const cleanInput = tNum.replace(/^t/i, '').trim()
    const target = rows.find(t => t.table_number.replace(/^t/i, '').trim() === cleanInput)
    
    if (!target) {
      toast.error("Table not found")
      return
    }
    if (target.id === table.id) {
      toast.error("Cannot merge table with itself")
      return
    }

    const isSourceOccupied = activeOrders.some((o) => o.table_id === table.id)
    const isTargetOccupied = activeOrders.some((o) => o.table_id === target.id)
    if (isSourceOccupied || isTargetOccupied) {
      toast.error("Cannot merge occupied tables! Finish active orders first.")
      return
    }

    if (confirm(`Merge Table ${target.table_number} into Table ${table.table_number}?\nThis combines seats and deletes the old table.`)) {
      const newCap = table.capacity + target.capacity
      const newWidth = table.shape === 'circle' ? 140 : (table.width || 100) + 60
      const historyData = {
        source_original: {
          capacity: table.capacity,
          width: table.width || 100,
          height: table.height || 100,
          shape: table.shape || 'rectangle',
        },
        target_original: {
          table_number: target.table_number,
          capacity: target.capacity,
          width: target.width || 100,
          height: target.height || 100,
          shape: target.shape || 'rectangle',
        }
      }

      try {
        await api.patch(`/tables/${table.id}`, { capacity: newCap, width: newWidth, shape: 'rectangle', is_merged: true, merge_history: historyData })
        await api.delete(`/tables/${target.id}`)
        toast.success(`Merged Table ${target.table_number} into ${table.table_number}`)
        load()
      } catch (err: any) {
        console.error(err)
        toast.error(err.response?.status === 400 || err.response?.status === 409 ? 'Cannot delete the merged table (it may have active orders).' : 'Failed to merge tables')
      }
    }
  }

  const handleSplit = async (table: DiningTable) => {
    if (!table.is_merged) {
      toast.error('Only merged tables can be split')
      return
    }

    const active = activeOrders.filter((o) => o.table_id === table.id)
    if (active.length > 0) {
      const confirmed = window.confirm('Splitting this table will cancel its active orders to free both tables. Continue?')
      if (!confirmed) return
    }

    if (table.merge_history) {
      const hist = table.merge_history as any
      try {
        if (active.length > 0) {
          await Promise.all(
            active.map((o) => 
              api.patch(`/orders/${o.id}/status`, null, { params: { status: 'cancelled' } })
            )
          )
        }

        await api.patch(`/tables/${table.id}`, { 
          capacity: hist.source_original.capacity, 
          width: hist.source_original.width, 
          height: hist.source_original.height,
          shape: hist.source_original.shape,
          is_merged: false,
          merge_history: null,
          status: 'available',
          waiter_id: null
        })
        
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
        load()
      } catch (err) {
        console.error("Split table error:", err)
        toast.error('Failed to split table')
      }
    } else {
      toast.error('Cannot split: original table history is missing')
    }
  }

  const toggleGridSeatSelection = (tableId: number, seatIndex: number) => {
    setSelectedSeatsMap(prev => {
      const current = prev[tableId] || []
      const updated = current.includes(seatIndex)
        ? current.filter(i => i !== seatIndex)
        : [...current, seatIndex].sort((a, b) => a - b)
      return { ...prev, [tableId]: updated }
    })
  }

  const handleGridSeatCustomer = async (table: DiningTable) => {
    const selected = selectedSeatsMap[table.id] || []
    try {
      await api.post('/orders/seat', {
        table_id: table.id,
        seat_count: selected.length > 0 ? selected.length : table.capacity,
        customer_name: selected.length > 0 
          ? `Seat ${selected.map(i => i + 1).join(', ')}` 
          : 'Full Table',
      })
      toast.success('Customer seated successfully')
      setSelectedSeatsMap(prev => ({ ...prev, [table.id]: [] }))
      load(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to seat customer')
    }
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-slate-500">Manage restaurant tables</p>
        </div>

        

     <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start sm:self-auto shadow-sm border border-slate-200 dark:border-slate-700">

  {/* Add Table Dropdown */}
  {!isStaff && (
    <div className="relative group">

      {/* Main Add Button */}
      <button
        className="h-10 px-3 rounded-xl bg-white dark:bg-slate-700
        hover:bg-slate-50 dark:hover:bg-slate-600
        text-slate-700 dark:text-white
        flex items-center gap-2
        shadow-sm transition-all duration-200"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Add</span>
      </button>

      {/* Floating Shapes */}
      <div
        className="absolute top-12 left-0
        opacity-0 invisible translate-y-2
        group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
        transition-all duration-200 z-50"
      >
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">

          {/* Circle */}
          <button
            onClick={() => openTableModal('circle')}
            className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-500/10
            hover:bg-violet-100 dark:hover:bg-violet-500/20
            flex items-center justify-center transition-all"
            title="Circle Table"
          >
            <div className="w-4 h-4 rounded-full border-[3px] border-violet-600" />
          </button>

          {/* Square */}
          <button
            onClick={() => openTableModal('square')}
            className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10
            hover:bg-emerald-100 dark:hover:bg-emerald-500/20
            flex items-center justify-center transition-all"
            title="Square Table"
          >
            <div className="w-4 h-4 rounded-md border-[3px] border-emerald-600" />
          </button>

          {/* Rectangle */}
          <button
            onClick={() => openTableModal('rectangle')}
            className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/10
            hover:bg-orange-100 dark:hover:bg-orange-500/20
            flex items-center justify-center transition-all"
            title="Rectangle Table"
          >
            <div className="w-6 h-3 rounded-sm border-[3px] border-orange-600" />
          </button>

        </div>
      </div>
    </div>
  )}

  {/* Grid Button */}
  <button
    onClick={() => setView('grid')}
    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
      view === 'grid'
        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
        : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
    }`}
  >
    <LayoutGrid className="w-4 h-4" />
    Grid
  </button>

  {/* Floor Button */}
  <button
    onClick={() => setView('floor')}
    className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
      view === 'floor'
        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
        : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
    }`}
  >
    <Map className="w-4 h-4" />
    Floor Plan
  </button>

</div>


        

      </div>

      {/* STATS OVERVIEW */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${item.bg} ${item.color}`}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{item.title}</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{item.value}</h3>
              </div>
            </div>
          )
        })}
      </div>

      {view === 'floor' ? (
        <FloorPlan
  tables={rows}
  waiters={waiters}
          activeOrders={activeOrders}
          onUpdate={() => load(true)}
  onDeleteTable={deleteTable}
  onAddTable={addTable}
  userRole={user?.role}
  onAddMenu={handleAddMenu}
          onSeatCustomer={handleSeatCustomer}
/>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rows.map((t) => {
            const tableOrders = activeOrders.filter(o => o.table_id === t.id)
            const occupiedSeats = new Set<number>()
            let isFull = false
            tableOrders.forEach(o => {
              if (!o.customer_name?.startsWith('Seat')) isFull = true
              else {
                const match = o.customer_name.match(/\d+/g)
                if (match) match.forEach(m => occupiedSeats.add(parseInt(m, 10)))
              }
            })
            const occCount = isFull ? t.capacity : Math.min(occupiedSeats.size, t.capacity)
            
            return (
            <div
              key={t.id}
              className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
            >
              {/* Decorative Background Element */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 opacity-60 pointer-events-none" />
              
              <div>
                <div className="relative flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {t.zone}
                      </span>
                      {t.is_merged && (
                        <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">
                          Merged
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-baseline gap-1">
                      <span className="text-lg text-slate-400 font-bold">#</span>{t.table_number}
                    </h2>
                  </div>
                  <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 dark:border-orange-800/50 shadow-sm">
                    <Armchair className="w-6 h-6" />
                  </div>
                </div>

                {/* Capacity Counter */}
                <div className="relative flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                    {!isStaff && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateCapacity(t.id, -1); }}
                        disabled={t.capacity <= 1}
                        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50"
                        title="Reduce Capacity"
                      >
                        -
                      </button>
                    )}
                    <span className="px-2 font-bold text-slate-700 dark:text-slate-300 text-xs tracking-wider">
                      {occCount > 0 ? `${occCount}/${t.capacity} OCCUPIED` : `${t.capacity} SEATS`}
                    </span>
                    {!isStaff && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateCapacity(t.id, 1); }}
                        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm shadow-sm transition-all"
                        title="Increase Capacity"
                      >
                        +
                      </button>
                    )}
                  </div>
                  
                  {t.waiter_name && (
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-400 px-2 py-1 rounded-md shadow-sm uppercase tracking-wider">
                      👤 {t.waiter_name.split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* Waiter Assignment (For managers/cashiers) */}
                {!isStaff && (
                  <div className="mt-3 relative">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Assign Waiter</label>
                    {waiters && waiters.length > 0 ? (
                      <select 
                        value={t.waiter_id || ''} 
                        onChange={(e) => assignWaiter(t.id, e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium cursor-pointer focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                      >
                        <option value="">No Waiter</option>
                        {waiters.map(w => <option key={w.id} value={w.user_id}>{w.full_name}</option>)}
                      </select>
                    ) : (
                      <div className="text-[10px] text-red-500 bg-red-500/10 p-1.5 rounded-lg text-center font-medium border border-red-500/10">
                        No Waiters Found
                      </div>
                    )}
                  </div>
                )}

                {/* Active Order Groups list */}
                {tableOrders.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Groups</label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {tableOrders.map((o) => (
                        <div key={o.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                          <div className="flex flex-col max-w-[120px]">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate" title={o.customer_name || 'Full Table'}>
                              {o.customer_name || 'Full Table'}
                            </span>
                            <span className="text-[9px] text-slate-500">{(o.seat_count || 1)} {(o.seat_count || 1) > 1 ? 'Seats' : 'Seat'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {user?.role === 'WAITER' && (!o.items || o.items.length === 0) && (
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Free these seats?')) {
                                    try {
                                      await api.patch(`/orders/${o.id}/status`, null, { params: { status: 'cancelled' } });
                                      toast.success('Seats freed');
                                      load(true);
                                    } catch {
                                      toast.error('Failed to free seats');
                                    }
                                  }
                                }}
                                className="px-2 py-1 bg-red-50/80 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Free
                              </button>
                            )}
                            {canPlaceOrder && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddMenu(t.id, o.seat_count, o.customer_name || 'Full Table');
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seat Selector (for waiters seating customer) */}
                {user?.role === 'WAITER' && t.capacity > occCount && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 space-y-2.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Select Seats to Assign</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: t.capacity }).map((_, idx) => {
                        const isOccupied = occupiedSeats.has(idx + 1)
                        const isSelected = selectedSeatsMap[t.id]?.includes(idx)
                        return (
                          <button
                            key={idx}
                            disabled={isOccupied}
                            onClick={(e) => { e.stopPropagation(); toggleGridSeatSelection(t.id, idx); }}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border ${
                              isOccupied
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-800 cursor-default opacity-80'
                                : isSelected
                                ? 'bg-orange-600 text-white border-orange-600 shadow-sm scale-95'
                                : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-100/40'
                            }`}
                            title={`Seat ${idx + 1}${isOccupied ? ' (Occupied)' : ''}`}
                          >
                            {idx + 1}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="relative mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  {!isStaff && (
                    <button
                      onClick={() => deleteTable(t.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all duration-200"
                      title="Delete Table"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  {canPlaceOrder ? (
                    <button
                      onClick={() => handleAddMenu(t.id, undefined, 'Full Table')}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors ml-auto"
                    >
                      Add Menu
                    </button>
                  ) : (
                    occCount < t.capacity ? (
                      <button
                        onClick={() => handleGridSeatCustomer(t)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors ml-auto"
                      >
                        Seat Customer {(selectedSeatsMap[t.id]?.length || 0) > 0 ? `(${selectedSeatsMap[t.id].length} Seat${selectedSeatsMap[t.id].length > 1 ? 's' : ''})` : '(Full Table)'}
                      </button>
                    ) : (
                      <span className="text-slate-450 dark:text-slate-500 font-bold text-xs py-2 px-4 ml-auto">Occupied</span>
                    )
                  )}
                </div>

                {/* Merge & Split Admin Buttons */}
                {!isStaff && (
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 justify-end">
                    <button
                      onClick={() => handleMerge(t)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 rounded-xl text-[10px] font-bold transition-all border border-slate-200 dark:border-slate-700"
                    >
                      Merge Table
                    </button>
                    <button
                      onClick={() => handleSplit(t)}
                      disabled={!t.is_merged}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                        t.is_merged
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 border-slate-200 dark:border-slate-700'
                          : 'bg-slate-50 dark:bg-slate-850 text-slate-400 border-transparent cursor-not-allowed opacity-40'
                      }`}
                    >
                      Split Table
                    </button>
                  </div>
                )}
              </div>
            </div>
            )})}
        </div>
      )}

      {showTableModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">

    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            Create Table
          </h2>

          <p className="text-slate-500 text-sm mt-1">
            Add new {selectedShape} table
          </p>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">

          {selectedShape === 'circle' && (
            <div className="w-5 h-5 rounded-full border-[3px] border-orange-600" />
          )}

          {selectedShape === 'square' && (
            <div className="w-5 h-5 rounded-md border-[3px] border-orange-600" />
          )}

          {selectedShape === 'rectangle' && (
            <div className="w-7 h-4 rounded-sm border-[3px] border-orange-600" />
          )}
        </div>
      </div>

      <div className="space-y-4">

        <div>
          <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Table Name
          </label>

          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Enter table name"
            className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

      </div>

      <div className="flex justify-end gap-3 mt-8">

        <button
          onClick={() => setShowTableModal(false)}
          className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium"
        >
          Cancel
        </button>

        <button
          onClick={addTable}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg"
        >
          Create Table
        </button>

      </div>

    </div>
  </div>
)}

    </div>

    
  )
}

export default Tables