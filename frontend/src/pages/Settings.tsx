import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import { useAuth } from '../contexts/AuthContext'

interface AppSettings {
  breakfast_time?: string
  lunch_time?: string
  dinner_time?: string
  [key: string]: any
}

const Settings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AppSettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/settings')
      .then(res => setSettings(res.data))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      await api.post('/settings', settings)
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-slate-500 mt-1">Manage global application settings.</p>
      </div>

      {isAdmin && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
          <h2 className="text-xl font-bold">Menu Schedule Times</h2>
          <p className="text-sm text-slate-500">
            Set the default time windows for meal periods in the Menu Scheduler.
            These are used if no schedule has been saved yet.
          </p>
          {loading ? (
            <p>Loading settings...</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Breakfast Time</label>
                <input
                  type="text"
                  name="breakfast_time"
                  value={settings.breakfast_time || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 09:00 AM - 11:00 AM"
                  className="w-full mt-2 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lunch Time</label>
                <input
                  type="text"
                  name="lunch_time"
                  value={settings.lunch_time || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 12:00 PM - 04:00 PM"
                  className="w-full mt-2 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dinner Time</label>
                <input
                  type="text"
                  name="dinner_time"
                  value={settings.dinner_time || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 05:00 PM - 10:00 PM"
                  className="w-full mt-2 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700"
            >
              Save Schedule Times
            </button>
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <h2 className="text-xl font-bold">Environment Configuration</h2>
        <p className="text-sm opacity-80">
          Configure <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">VITE_BACKEND_URL</code>,{' '}
          <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">CORS_ORIGINS</code>, and{' '}
          <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">FRONTEND_PUBLIC_URL</code> on the API for QR links and
          WebSocket URLs.
        </p>
        <p className="text-sm opacity-80">
          Default GST-style tax on new orders is 5% (editable at billing). Multi-branch records use the{' '}
          <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">branches</code> table.
        </p>
      </div>
    </div>
  )
}

export default Settings
