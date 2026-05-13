import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  MapPin,
  X,
} from 'lucide-react'

import toast from 'react-hot-toast'
import { api } from '../api/api'
import type { DiningTable } from '../types'

const Tables = () => {
  const [rows, setRows] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    table_number: '',
    capacity: 4,
    zone: 'Main Hall',
  })

  const load = useCallback(() => {
    setLoading(true)
    void api
      .get<DiningTable[]>('/tables')
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditId(null)
    setForm({ table_number: '', capacity: 4, zone: 'Main Hall' })
    setOpen(true)
  }

  const openEdit = (t: DiningTable) => {
    setEditId(t.id)
    setForm({
      table_number: t.table_number,
      capacity: t.capacity,
      zone: t.zone || '',
    })
    setOpen(true)
  }

  const submit = async () => {
    try {
      if (!form.table_number) {
        toast.error('Table number required')
        return
      }

      if (editId) {
        await api.patch(`/tables/${editId}`, form)
        toast.success('Table updated')
      } else {
        await api.post('/tables', form)
        toast.success('Table created')
      }

      setOpen(false)
      load()
    } catch {
      toast.error('Something went wrong')
    }
  }

  const deleteTable = async (id: number) => {
    if (!confirm('Delete this table?')) return
    await api.delete(`/tables/${id}`)
    toast.success('Deleted')
    load()
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

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white"
        >
          <Plus className="h-4 w-4" />
          Add Table
        </button>
      </div>

      {/* TABLES */}
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

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => openEdit(t)}
                className="p-2 rounded-lg border"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                onClick={() => deleteTable(t.id)}
                className="p-2 rounded-lg border text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4">

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editId ? 'Edit Table' : 'Add Table'}
              </h2>

              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <input
              placeholder="Table Number"
              value={form.table_number}
              onChange={(e) =>
                setForm({ ...form, table_number: e.target.value })
              }
              className="w-full border rounded-xl p-3"
            />

            <input
              type="number"
              placeholder="Capacity"
              value={form.capacity}
              onChange={(e) =>
                setForm({
                  ...form,
                  capacity: Number(e.target.value),
                })
              }
              className="w-full border rounded-xl p-3"
            />

            <input
              placeholder="Zone"
              value={form.zone}
              onChange={(e) =>
                setForm({ ...form, zone: e.target.value })
              }
              className="w-full border rounded-xl p-3"
            />

            <button
              onClick={submit}
              className="w-full bg-black text-white py-3 rounded-xl"
            >
              {editId ? 'Update' : 'Create'}
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

export default Tables