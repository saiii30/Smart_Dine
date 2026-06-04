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
      <form onSubmit={submit} className="space-y-5">
        {err && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium text-center">{err}</div>}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
          <input
            required
            placeholder="John Doe"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-4 py-3.5 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
          <input
            type="email"
            required
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-4 py-3.5 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password (Min 8 characters)</label>
          <input
            type="password"
            minLength={8}
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-4 py-3.5 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
        >
          {loading ? 'Creating account...' : 'Create Account'}
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
