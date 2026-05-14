import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import { X, Trash2, Pencil } from 'lucide-react'

interface Emp {
  id: number
  full_name: string
  role: string
  email?: string | null
  is_active: boolean
}

const Employees = () => {
  const [rows, setRows] = useState<Emp[]>([])
  const [open, setOpen] = useState(false)

  const [editId, setEditId] = useState<number | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'WAITER',
  })

  // 🔥 password editable (now always visible in edit too)
  const [password, setPassword] = useState('')

  // LOAD
  const load = () => {
    void api.get<Emp[]>('/employees').then((r) => setRows(r.data))
  }

  useEffect(() => {
    load()
  }, [])

  // RESET
  const reset = () => {
    setForm({ full_name: '', email: '', role: 'WAITER' })
    setPassword('')
    setEditId(null)
    setOpen(false)
  }

  // GENERATE PASSWORD
  const generatePassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    const pwd = Array.from({ length: 8 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join('')

    setPassword(pwd)
  }

  // CREATE + UPDATE
  const saveEmployee = async () => {
    if (!form.full_name || !form.email) {
      toast.error('Fill all fields')
      return
    }

    try {
      if (editId) {
        // UPDATE (password optional)
        await api.patch(`/employees/${editId}`, {
          ...form,
          password: password || undefined,
        })

        toast.success('Employee updated')
      } else {
        // CREATE (password required)
        if (!password) {
          toast.error('Generate password')
          return
        }

        await api.post('/employees', {
          ...form,
          password,
        })

        toast.success('Employee created')
      }

      reset()
      load()
    } catch {
      toast.error('Operation failed')
    }
  }

  // DELETE
  const deleteEmployee = async (id: number) => {
    if (!confirm('Delete this employee?')) return

    try {
      await api.delete(`/employees/${id}`)
      toast.success('Deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  // EDIT
  const editEmployee = (emp: Emp) => {
    setForm({
      full_name: emp.full_name,
      email: emp.email || '',
      role: emp.role,
    })

    setEditId(emp.id)
    setPassword('') // user can enter new password if needed
    setOpen(true)
  }

  const roleColor = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20'
      case 'CASHIER':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20'
      case 'KITCHEN':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700'
    }
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-slate-500">
            Manage restaurant staff & roles
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm"
        >
          Add Employee
        </button>
      </div>

      {/* TABLE */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">

        <table className="w-full text-sm">

          <thead className="bg-slate-50 dark:bg-slate-800 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((e) => (
              <tr
                key={e.id}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="p-3 font-medium">{e.full_name}</td>
                <td className="p-3 text-slate-500">{e.email}</td>

                <td className="p-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${roleColor(e.role)}`}>
                    {e.role}
                  </span>
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      e.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {e.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="p-3 flex gap-3">
                  <button
                    onClick={() => editEmployee(e)}
                    className="text-blue-600 hover:scale-110 transition"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={() => deleteEmployee(e.id)}
                    className="text-red-600 hover:scale-110 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">

          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">

            {/* HEADER */}
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">
                {editId ? 'Edit Employee' : 'Create Employee'}
              </h2>

              <button onClick={reset}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* NAME */}
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Full Name"
              value={form.full_name}
              onChange={(e) =>
                setForm({ ...form, full_name: e.target.value })
              }
            />

            {/* EMAIL */}
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            {/* ROLE */}
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              <option value="WAITER">Waiter</option>
              <option value="CASHIER">Cashier</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="MANAGER">Manager</option>
            </select>

            {/* PASSWORD (EDIT + CREATE BOTH) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>

              <input
                className="w-full border rounded-lg px-3 py-2 bg-gray-100"
                value={password}
                placeholder="Enter or generate password"
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={generatePassword}
                className="w-full py-2 rounded-lg bg-blue-600 text-white"
              >
                Generate Password
              </button>
            </div>

            {/* SAVE */}
            <button
              onClick={saveEmployee}
              className="w-full py-2 rounded-lg bg-slate-900 text-white"
            >
              {editId ? 'Update' : 'Create'}
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

export default Employees