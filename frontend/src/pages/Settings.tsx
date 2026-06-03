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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Global Custom Notes
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Manage predefined custom notes (e.g., Less Spicy, No Garlic) to be used across menu items.
          </p>
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="text"
                placeholder="Add new note..."
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
                className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-transparent outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={() => {
                  if (newNote.trim() && !globalNotes.includes(newNote.trim())) {
                    setGlobalNotes(prev => [...prev, newNote.trim()]);
                    setNewNote('');
                  }
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Add
              </button>
            </div>
            
            {/* Category Quick Load Buttons */}
            <div className="flex flex-wrap gap-2 py-2 border-y border-slate-100 dark:border-slate-800/50">
              <span className="text-xs font-semibold text-slate-500 w-full uppercase tracking-wider mb-1">Quick Load By Category:</span>
              {Object.entries({
                "Spice & Dietary": ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Allergy Alert', 'Jain (No Onion/Garlic)', 'Mild', 'Medium Spicy', 'Spicy', 'Extra Spicy', 'No Onion', 'No Garlic', 'No Cabbage', 'No Capsicum'],
                "Starters & Soups": ['Extra Dip', 'Extra Crispy', 'Less Oil', 'Extra Ketchup', 'Extra Mayo', 'Piping Hot', 'No Croutons', 'Clear Soup', 'Thick Soup', 'Dressing on Side', 'Extra Dressing', 'No Olive Oil', 'No Vinegar'],
                "Mains & Biryani": ['Extra Gravy', 'Dry', 'Semi-Gravy', 'Boneless', 'With Bone', 'Extra Meat', 'Well Cooked', 'Extra Raita', 'Extra Salna', 'Double Masala', 'Extra Leg Piece', 'Extra Ghee', 'Extra Butter', 'No Butter', 'Soft'],
                "Fast Food & Pizza": ['Al Dente', 'Extra Sauce', 'No MSG', 'Extra Cheese', 'Thin Crust', 'Thick Crust', 'Well Baked', 'No Mushrooms', 'No Mayo', 'Extra Cheese Slice', 'Toasted', 'Grilled', 'No Lettuce', 'No Tomato'],
                "Grills & Seafood": ['Extra Lemon', 'Deep Fried', 'Tawa Fry', 'No Fishy Smell', 'Extra Char', 'Medium Rare', 'Medium', 'Well Done', 'Extra BBQ Sauce', 'Well Roasted', 'Extra Mint Chutney'],
                "Beverages & Desserts": ['Less Sweet', 'Warm', 'Extra Nuts', 'No Raisins', 'Eggless', 'With Ice Cream', 'No Ice', 'Less Ice', 'Extra Ice', 'No Sugar', 'Less Sugar', 'Thick', 'No Water', 'Room Temp', 'Strong', 'Light', 'Without Milk', 'Extra Milk'],
                "Breakfast & Misc": ['Extra Sweet Chutney', 'Extra Spicy Chutney', 'No Yogurt (Dahi)', 'Extra Sev', 'Extra Sambar', 'Extra Chutney', 'Sunny Side Up', 'Scrambled', 'Hard Boiled', 'Roast', 'Non-Spicy', 'Kid Size', 'Upgrade Drink', 'Extra Fries', 'Extra Portion']
              }).map(([catName, notes]) => (
                <button
                  key={catName}
                  onClick={() => setGlobalNotes(prev => Array.from(new Set([...prev, ...notes])))}
                  className="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-[11px] font-bold rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition whitespace-nowrap"
                >
                  + {catName}
                </button>
              ))}
              <button
                onClick={() => setGlobalNotes([])}
                className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition whitespace-nowrap"
              >
                Clear All
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {globalNotes.length === 0 && <span className="text-sm text-slate-500 italic">No notes added yet.</span>}
              {globalNotes.map(note => (
                <span key={note} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                  {note}
                  <button
                    onClick={() => setGlobalNotes(prev => prev.filter(n => n !== note))}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
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