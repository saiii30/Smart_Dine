import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'



const Register = () => {
  const { register } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [full_name, setFullName] = useState('')
  const [password, setPassword] = useState('')

  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await register({ email, full_name, password })
      nav('/login')
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed'
      setErr(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Smart Dine staff access">
      <form onSubmit={submit} className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            required
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password (min 8)</label>
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Register'}
        </button>
        <p className="text-center text-sm">
          <Link to="/login" className="text-amber-600 font-medium">
            Back to login
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Register
