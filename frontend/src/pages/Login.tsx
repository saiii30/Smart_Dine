import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

const Login = () => {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const user = await login({ email, password })

      if (user.role === 'WAITER') {
        nav('/tables')
      } else if (user.role === 'KITCHEN') {
        nav('/kitchen')
      } else {
        nav('/dashboard')
      }
    } catch {
      setErr('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to Smart Dine">
      <form onSubmit={submit} className="space-y-5">
        {err && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium text-center">{err}</div>}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
          <input
            type="email"
            required
            placeholder="admin@smartdine.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-4 py-3.5 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
          <input
            type="password"
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
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-slate-500">
          <Link to="/register" className="text-amber-600 font-medium">
            Create account
          </Link>
          {' · '}
          <Link to="/forgot-password" className="text-slate-500">
            Forgot password
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login
