import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'

import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable } from '../types'
import FloorPlan from '../components/FloorPlan'
import { useAuth } from '../contexts/AuthContext'

const Tables = () => {
  const { user } = useAuth()
  const isStaff = user?.role === 'WAITER' || user?.role === 'KITCHEN'
  const [rows, setRows] = useState<DiningTable[]>([])
  const [waiters, setWaiters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<'grid' | 'floor'>('floor')

  const load = useCallback(() => {
    setLoading(true)
    void api
      .get<DiningTable[]>('/tables')
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-slate-500">Manage restaurant tables</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setView('grid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'opacity-70 text-slate-600 dark:text-slate-300'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView('floor')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'floor' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'opacity-70 text-slate-600 dark:text-slate-300'}`}
          >
            Floor Plan
          </button>
        </div>

      </div>

      {view === 'floor' ? (
        <FloorPlan tables={rows} waiters={waiters} onUpdate={load} onDeleteTable={deleteTable} userRole={user?.role} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm"
            >
              <div className="flex justify-between">
                <h2 className="text-xl font-bold">{t.table_number}</h2>

                <span className="text-sm text-slate-500">
                  {t.zone}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                <Users className="h-4 w-4" />
                {t.capacity} seats
              </div>

              {!isStaff && (
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => deleteTable(t.id)}
                    className="p-2 rounded-lg border text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Tables