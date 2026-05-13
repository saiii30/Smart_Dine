import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import { X } from 'lucide-react'

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

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'WAITER',
  })

  const [password, setPassword] = useState('')

  const load = () => {
    void api.get<Emp[]>('/employees').then((r) => setRows(r.data))
  }

  useEffect(() => {
    load()
  }, [])

  const generatePassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    return Array.from({ length: 8 })
      .map(() =>
        chars[Math.floor(Math.random() * chars.length)]
      )
      .join('')
  }

  const createEmployee = async () => {
    if (!form.full_name || !form.email) {
      toast.error('Fill all fields')
      return
    }

    const pwd = generatePassword()
    setPassword(pwd)

    try {
      await api.post('/employees', {
        ...form,
        password: pwd,
      })

      toast.success('Employee created')

      setForm({ full_name: '', email: '', role: 'WAITER' })
      setOpen(false)
      load()
    } catch {
      toast.error('Failed to create employee')
    }
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
            </tr>
          </thead>

          <tbody>
            {rows.map((e) => (
              <tr
                key={e.id}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="p-3 font-medium">
                  {e.full_name}
                </td>

                <td className="p-3 text-slate-500">
                  {e.email}
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${roleColor(
                      e.role
                    )}`}
                  >
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">

          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">

            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">
                Create Employee
              </h2>

              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              className="w-full border rounded-lg px-3 py-2 bg-transparent"
              placeholder="Full Name"
              value={form.full_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  full_name: e.target.value,
                })
              }
            />

            <input
              className="w-full border rounded-lg px-3 py-2 bg-transparent"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />

            <select
              className="w-full border rounded-lg px-3 py-2 bg-transparent"
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value,
                })
              }
            >
              <option value="WAITER">Waiter</option>
              <option value="CASHIER">Cashier</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="MANAGER">Manager</option>
            </select>

            {password && (
              <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                Generated Password:
                <div className="font-bold">{password}</div>
              </div>
            )}

            <button
              onClick={createEmployee}
              className="w-full py-2 rounded-lg bg-slate-900 text-white"
            >
              Create Employee
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

export default Employees