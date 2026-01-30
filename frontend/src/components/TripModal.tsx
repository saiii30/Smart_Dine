import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Plus, Trash2 } from 'lucide-react'
import { Trip, Vehicle, Driver, TripSchedule } from '../types'
import { useTheme } from '../contexts/ThemeContext'

type MenuColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'

interface TripModalProps {
  trip?: Trip | null  
  onClose: () => void
  onSuccess: () => void
}

const TripModal = ({ trip, onClose, onSuccess }: TripModalProps) => {
  const { menuColor } = useTheme()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // const [formData, setFormData] = useState({
  //   company_name: '',
  //   name: '',
  //   address: '',
  //   schedules: [] as Omit<TripSchedule, 'id' | 'trip_id' | 'created_at' | 'updated_at' | 'vehicle_number' | 'driver_name'>[],
  // })

  const [formData, setFormData] = useState({
  company_id: '',
  company_name: '',
  company_branch: '',
  schedules: [] as {
    id?: number            
    start_date: string
    end_date: string
    starting_point: string
    end_point: string
    start_time: string
    end_time: string
    way: 'one_way' | 'two_way'
    passenger_count: number
    driver_id?: string   // NOT number
   
    vehicle_id?: number
    trip_type: string
    notes?: string
  }[],
})

 const [deletedScheduleIds, setDeletedScheduleIds] = useState<number[]>([])

  const [companies, setCompanies] = useState<{ id: string; company_name: string; company_branch: string; agency_id: string }[]>([])

  useEffect(() => {
  const agencyId = localStorage.getItem('selectedAgencyId')
  if (!agencyId) return

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/companies/api/companies/trip/dropdown/?agency_id=${agencyId}`)
      alert(JSON.stringify(res.data))
      setCompanies(res.data) // [{id, company_name}]
    } catch (err) {
      alert('Error fetching companies')
      console.error('Failed to fetch companies', err)
    }
  }

  fetchCompanies()
}, [])



  useEffect(() => {
    fetchVehicles()
    fetchDrivers()
  }, [])

  

useEffect(() => {
  if (!trip) return

  setFormData({
    company_id: trip.company_id,
    company_branch: trip.company_branch || '',
    company_name: trip.company_name || '',
    schedules: (trip.schedules || []).map(s => ({
      id: s.id, 
      start_date: toDateInput(s.start_date),
end_date: toDateInput(s.end_date),

      starting_point: s.starting_point || '',
      end_point: s.end_point || '',
      start_time: s.start_time || '',
      end_time: s.end_time || '',
      passenger_count: s.passenger_count || 0,
      driver_id: s.driver_id ?? undefined,
      vehicle_id: s.vehicle_id ?? undefined,
      trip_type: s.trip_type || '',
      notes: s.notes || '',
      way: s.way as 'one_way' | 'two_way' || 'one_way',
    })),
  })
}, [trip])





  const fetchVehicles = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/vehicles/')
      setVehicles(response.data.filter((v: Vehicle) => v.is_active))
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    }
  }

  

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/drivers/')
      setDrivers(response.data.filter((d: Driver) => d.is_active))
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
    }
  }

  const getHeaderColorClasses = (color: MenuColor) => {
    const colorMap: Record<MenuColor, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-600 dark:bg-blue-700', text: 'text-white' },
      green: { bg: 'bg-green-600 dark:bg-green-700', text: 'text-white' },
      purple: { bg: 'bg-purple-600 dark:bg-purple-700', text: 'text-white' },
      orange: { bg: 'bg-orange-600 dark:bg-orange-700', text: 'text-white' },
      red: { bg: 'bg-red-600 dark:bg-red-700', text: 'text-white' },
      indigo: { bg: 'bg-indigo-600 dark:bg-indigo-700', text: 'text-white' },
    }
    return colorMap[color] || colorMap.blue
  }

  const headerColors = getHeaderColorClasses(menuColor)

  

  const removeSchedule = (index: number) => {
  const schedule = formData.schedules[index]

  if (schedule.id) {
    setDeletedScheduleIds(prev => [...prev, schedule.id!])
  }

  setFormData({
    ...formData,
    schedules: formData.schedules.filter((_, i) => i !== index),
  })
}


 

  const addSchedule = () => {
  setFormData({
    ...formData,
    schedules: [
      ...formData.schedules,
      {
        id: undefined,
        start_date: '',
        end_date: '',
        starting_point: '',
        end_point: '',
        start_time: '',
        end_time: '',
        way: 'one_way',
        passenger_count: 0,
        driver_id: undefined,
        vehicle_id: undefined,
        trip_type: '',
        notes: '',
      },
    ],
  })
}


  // const removeSchedule = (index: number) => {
  //   setFormData({
  //     ...formData,
  //     schedules: formData.schedules.filter((_, i) => i !== index),
  //   })
  // }

  const updateSchedule = (index: number, field: string, value: string | number | undefined) => {
    const updated = [...formData.schedules]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, schedules: updated })
  }

  // // Get available vehicles/drivers (not already assigned to another schedule at the same time)
  // const getAvailableVehicles = (scheduleIndex: number) => {
  //   const currentSchedule = formData.schedules[scheduleIndex]
  //   if (!currentSchedule.departure_datetime) return vehicles

  //   return vehicles.filter(vehicle => {
  //     // Check if vehicle is already assigned to another schedule at this time
  //     const isAssigned = formData.schedules.some((s, idx) => 
  //       idx !== scheduleIndex && 
  //       s.vehicle_id === vehicle.id && 
  //       s.departure_datetime === currentSchedule.departure_datetime
  //     )
  //     return !isAssigned
  //   })
  // }

  // const getAvailableDrivers = (scheduleIndex: number) => {
  //   const currentSchedule = formData.schedules[scheduleIndex]
  //   if (!currentSchedule.departure_datetime) return drivers

  //   return drivers.filter(driver => {
  //     // Check if driver is already assigned to another schedule at this time
  //     const isAssigned = formData.schedules.some((s, idx) => 
  //       idx !== scheduleIndex && 
  //       s.driver_id === driver.id && 
  //       s.departure_datetime === currentSchedule.departure_datetime
  //     )
  //     return !isAssigned
  //   })
  // }


  const getScheduleKey = (s: any) => {
  if (!s.start_date || !s.start_time) return ''
  return `${s.start_date} ${s.start_time}`
}

const getAvailableVehicles = (scheduleIndex: number) => {
  const current = formData.schedules[scheduleIndex]
  const key = getScheduleKey(current)
  if (!key) return vehicles

  return vehicles.filter(vehicle =>
    !formData.schedules.some(
      (s, idx) =>
        idx !== scheduleIndex &&
        s.vehicle_id === vehicle.id &&
        getScheduleKey(s) === key
    )
  )
}

const getAvailableDrivers = (scheduleIndex: number) => {
  const current = formData.schedules[scheduleIndex]
  const key = getScheduleKey(current)
  if (!key) return drivers

  return drivers.filter(driver =>
    !formData.schedules.some(
      (s, idx) =>
        idx !== scheduleIndex &&
        s.driver_id === driver.id &&
        getScheduleKey(s) === key
    )
  )
}
const toDateInput = (value?: string | null) => {
  if (!value) return ''
  // handles "2026-01-06T00:00:00" and "2026-01-06"
  return value.split('T')[0]
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const agencyId = localStorage.getItem('selectedAgencyId')
    const token = localStorage.getItem('token')

    if (!agencyId) throw new Error('Agency not selected')

    const headers = {
      Authorization: `Bearer ${token}`,
    }

    // 🧹 DELETE REMOVED SCHEDULES
    for (const id of deletedScheduleIds) {
      await axios.delete(
        `http://127.0.0.1:8000/api/trip-schedules/${id}`,
        { headers }
      )
    }

    // 🔁 CREATE / UPDATE SCHEDULES
    for (const s of formData.schedules) {
      const payload = {
        trip_id: trip ? trip.id : crypto.randomUUID(),
        agency_id: agencyId,
        company_id: formData.company_id,
        company_name: formData.company_name,
        company_branch: formData.company_branch,
        start_date: s.start_date || null,
        end_date: s.end_date || null,
        starting_point: s.starting_point || null,
        end_point: s.end_point || null,
        start_time: s.start_time || null,
        end_time: s.end_time || null,
        way: s.way,
        trip_type: s.trip_type,
        passenger_count: s.passenger_count,
        driver_id: s.driver_id || null,
        vehicle_id: s.vehicle_id || null,
        notes: s.notes || null,
        is_active: true,
      }

      if (s.id) {
        // 🟡 UPDATE
        await axios.put(
          `http://127.0.0.1:8000/api/trip-schedules/${s.id}`,
          payload,
          { headers }
        )
      } else {
        // 🟢 CREATE
        await axios.post(
          `http://127.0.0.1:8000/api/trip-schedules/`,
          payload,
          { headers }
        )
      }
    }

    onSuccess()
  } catch (err: any) {
    setError(err.response?.data?.detail || err.message)
  } finally {
    setLoading(false)
  }
}



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`sticky top-0 ${headerColors.bg} px-6 py-4 flex justify-between items-center rounded-t-lg`}>
          <h2 className={`text-xl font-semibold ${headerColors.text}`}>
            {trip ? 'Edit Trip' : 'Add Trip'}
          </h2>
          <button
            onClick={onClose}
            className={`${headerColors.text} hover:opacity-70 transition-opacity`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

       <form
  onSubmit={handleSubmit}
  className="max-w-6xl mx-auto bg-white dark:bg-gray-900
             rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800"
>
  <div className="p-8 space-y-8">

    {/* ================= HEADER ================= */}
    <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {trip ? 'Update Trip' : 'Create New Trip'}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage trip details and schedules
      </p>
    </div>

    {/* ================= ERROR ================= */}
    {error && (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                      text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    )}

    {/* ================= COMPANY ================= */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Company Name *
        </label>
        <select
          required
          value={formData.company_id}
          onChange={(e) => {
            const selected = companies.find(c => c.id === e.target.value)
            setFormData({
              ...formData,
              company_id: e.target.value,
              company_name: selected?.company_name || '',
            })
          }}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700
                     bg-white dark:bg-gray-800
                     focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">Select Company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.company_name} - {company.company_branch}
            </option>
          ))}
        </select>
      </div>

     
    </div>

    {/* ================= SCHEDULES ================= */}
    <div>
      <div className="flex justify-between items-center mb-4">
        

        <button
          type="button"
          onClick={addSchedule}
          className="flex items-center gap-2 px-4 py-2 rounded-xl
                     bg-primary-600 text-white shadow-md
                     hover:bg-primary-700 transition"
        >
          <Plus className="h-4 w-4" />
          Add Schedule
        </button>
      </div>

      <div className="space-y-6">
        {formData.schedules.map((schedule, index) => (
          <div
            key={index}
            className="p-6 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-gray-50 dark:bg-gray-800/50 shadow-sm"
          >
            {/* ===== Schedule Header ===== */}
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold">
                Schedule {index + 1}
              </h4>
              <button
                type="button"
                onClick={() => removeSchedule(index)}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>

            {/* ===== Inputs ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['Start Date', 'date', 'start_date'],
                ['End Date', 'date', 'end_date'],
                ['Starting Point', 'text', 'starting_point'],
                ['End Point', 'text', 'end_point'],
                ['Start Time', 'time', 'start_time'],
                ['End Time', 'time', 'end_time'],
              ].map(([label, type, field]) => (
                <div key={field}>
                  <label className="block text-xs font-medium mb-1">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={(schedule as any)[field] || ''}
                    onChange={(e) =>
                      updateSchedule(index, field as any, e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                               bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium mb-1">Trip Way</label>
                <select
                  value={schedule.way}
                  onChange={(e) => updateSchedule(index, 'way', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                >
                  <option value="one_way">One Way</option>
                  <option value="two_way">Two Way</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Passengers</label>
                <input
                  type="number"
                  value={schedule.passenger_count}
                  onChange={(e) =>
                    updateSchedule(index, 'passenger_count', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                />
              </div>


              <div>
                <label className="block text-xs font-medium mb-1">Select Driver</label>
                <select
                  value={schedule.driver_id || ''}
                   onChange={(e) => updateSchedule(index, 'driver_id', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                >
                  <option value="">Select Driver</option>
       {getAvailableDrivers(index).map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name}
                          </option>
                        ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Select Vehicle</label>
                <select
                    value={schedule.vehicle_id || ''}
      onChange={(e) => updateSchedule(index, 'vehicle_id', Number(e.target.value))}
    
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                >
                  <option value="">Select Vehicle</option>
      {getAvailableVehicles(index).map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                          </option>
                        ))}
                </select>
              </div>



              

              

              <div>
                <label className="block text-xs font-medium mb-1">Trip Type</label>
                <input
                  type="text"
                  value={schedule.trip_type}
                  onChange={(e) =>
                    updateSchedule(index, 'trip_type', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>

            {/* ===== Notes ===== */}
            <div className="mt-4">
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea
                rows={2}
                value={schedule.notes || ''}
                onChange={(e) =>
                  updateSchedule(index, 'notes', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ================= FOOTER ================= */}
    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700
                   hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 rounded-xl bg-primary-600 text-white
                   hover:bg-primary-700 shadow-md disabled:opacity-50"
      >
        {loading ? 'Saving...' : trip ? 'Update Trip' : 'Create Trip'}
      </button>
    </div>

  </div>
</form>

      </div>
    </div>
  )
}

export default TripModal
