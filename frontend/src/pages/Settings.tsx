import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api/api'
import { useAuth } from '../contexts/AuthContext'
import { X } from 'lucide-react'
 
// Helper to convert "HH:mm" (24h) to "HH:mm AM/PM"
const formatTo12h = (time24: string): string => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  let hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
};
 
// Helper to parse "HH:mm AM/PM - HH:mm AM/PM" into { start: "HH:mm", end: "HH:mm" }
const parseRangeTo24h = (rangeStr?: string): { start: string; end: string } => {
  if (!rangeStr) return { start: '', end: '' };
  const parts = rangeStr.split('-').map(s => s.trim());
  if (parts.length !== 2) return { start: '', end: '' };
 
  const to24h = (timeStr: string): string => {
    const match12 = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (match12) {
      let [, h, m, ampm] = match12;
      let hours = parseInt(h, 10);
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
    }
    // Handle if it's already in 24h format
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      return timeStr;
    }
    return ''; // Return empty if format is not recognized
  };
 
  return { start: to24h(parts[0]), end: to24h(parts[1]) };
};

const Settings = () => {
  const { user } = useAuth()

  const [timeInputs, setTimeInputs] = useState({
    breakfast_start: '',
    breakfast_end: '',
    lunch_start: '',
    lunch_end: '',
    dinner_start: '',
    dinner_end: '',
  })
  const [cancelPolicy, setCancelPolicy] = useState('all')
  const [globalNotes, setGlobalNotes] = useState<string[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        const dbSettings = res.data;
        
        const breakfast = parseRangeTo24h(dbSettings.breakfast_time);
        const lunch = parseRangeTo24h(dbSettings.lunch_time);
        const dinner = parseRangeTo24h(dbSettings.dinner_time);

        setTimeInputs({
          breakfast_start: breakfast.start,
          breakfast_end: breakfast.end,
          lunch_start: lunch.start,
          lunch_end: lunch.end,
          dinner_start: dinner.start,
          dinner_end: dinner.end,
        })
      setCancelPolicy(dbSettings.cancellation_policy || 'all')
      if (dbSettings.global_notes) {
        setGlobalNotes(dbSettings.global_notes.split('|').filter(Boolean))
      }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const payload = {
      breakfast_time: timeInputs.breakfast_start && timeInputs.breakfast_end ? `${formatTo12h(timeInputs.breakfast_start)} - ${formatTo12h(timeInputs.breakfast_end)}` : '',
      lunch_time: timeInputs.lunch_start && timeInputs.lunch_end ? `${formatTo12h(timeInputs.lunch_start)} - ${formatTo12h(timeInputs.lunch_end)}` : '',
      dinner_time: timeInputs.dinner_start && timeInputs.dinner_end ? `${formatTo12h(timeInputs.dinner_start)} - ${formatTo12h(timeInputs.dinner_end)}` : '',
      cancellation_policy: cancelPolicy,
      global_notes: globalNotes.join('|'),
    };

    try {
      await api.post('/settings', payload)

      // Automatically sync the updated times to the Menu Scheduler slots
      try {
        const schedRes = await api.get('/schedule')
        if (schedRes.data && schedRes.data.length > 0) {
          const updatedSlots = schedRes.data.map((slot: any) => {
            if (slot.name === 'Breakfast' && payload.breakfast_time) {
              return { ...slot, time: payload.breakfast_time }
            }
            if (slot.name === 'Lunch' && payload.lunch_time) {
              return { ...slot, time: payload.lunch_time }
            }
            if (slot.name === 'Dinner' && payload.dinner_time) {
              return { ...slot, time: payload.dinner_time }
            }
            return slot
          })
          await api.post('/schedule', { slots: updatedSlots })
        }
      } catch (err) {
        console.error('Failed to sync schedule slots:', err)
      }

      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save settings.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setTimeInputs((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>

        <p className="text-slate-500 mt-1">
          Manage global application settings.
        </p>
      </div>

      {/* Schedule Settings */}
      {isAdmin && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Menu Schedule Times
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Configure meal time ranges used in the Menu Scheduler.
            </p>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">
              Loading settings...
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-6">
              {/* Breakfast */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Breakfast Time
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    name="breakfast_start"
                    value={timeInputs.breakfast_start || ''}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  <span className="text-slate-500">to</span>

                  <input
                    type="time"
                    name="breakfast_end"
                    value={timeInputs.breakfast_end || ''}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Lunch */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Lunch Time
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    name="lunch_start"
                    value={timeInputs.lunch_start || ''}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  <span className="text-slate-500">to</span>

                  <input
                    type="time"
                    name="lunch_end"
                    value={timeInputs.lunch_end || ''}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Dinner */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Dinner Time
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    name="dinner_start"
                    value={timeInputs.dinner_start || ''}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  <span className="text-slate-500">to</span>

                  <input
                    type="time"
                    name="dinner_end"
                    value={timeInputs.dinner_end || ''}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

        {/* Order Management Settings */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Cancellation Policy
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Select when waiters are allowed to cancel an order or item.
          </p>
          <div className="max-w-md space-y-3">
            <select value={cancelPolicy} onChange={(e) => setCancelPolicy(e.target.value)} className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500">
              <option value="none">Disabled (No Cancellations)</option>
              <option value="pending">Pending Only (Not Started)</option>
              <option value="preparing">Up to Preparing State</option>
              <option value="ready">Up to Ready State</option>
              <option value="all">All Enabled (Anytime before served)</option>
            </select>
          </div>
        </div>

        {/* Global Custom Notes Settings */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Global Custom Notes
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Manage predefined modifiers (e.g., Less Spicy, No Garlic) for menu items.
              </p>
            </div>
            {globalNotes.length > 0 && (
              <button
                onClick={() => setGlobalNotes([])}
                className="text-sm font-semibold text-red-500 hover:text-red-600 transition"
              >
                Clear All Notes
              </button>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="Type a new custom note and press Enter..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newNote.trim() && !globalNotes.includes(newNote.trim())) {
                      setGlobalNotes(prev => [...prev, newNote.trim()]);
                      setNewNote('');
                    }
                  }
                }}
                className="flex-1 border border-slate-300 dark:border-slate-700 rounded-2xl px-5 py-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-slate-700 dark:text-slate-200 shadow-sm"
              />
              <button
                onClick={() => {
                  if (newNote.trim() && !globalNotes.includes(newNote.trim())) {
                    setGlobalNotes(prev => [...prev, newNote.trim()]);
                    setNewNote('');
                  }
                }}
                className="px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm whitespace-nowrap"
              >
                Add Note
              </button>
            </div>

            {globalNotes.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                   <span className="text-xl">📝</span>
                </div>
                <p className="text-slate-500 font-medium">No custom notes added yet.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {globalNotes.map(note => (
                  <div key={note} className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-orange-500 transition-colors group">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{note}</span>
                    <button
                      onClick={() => setGlobalNotes(prev => prev.filter(n => n !== note))}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
            </>
          )}

          {/* Save Button */}
      <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition"
            >
          Save Settings
            </button>
          </div>
        </div>
      )}

     
    </div>
  )
}

export default Settings