import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Plus, Trash2 } from 'lucide-react'
import { Trip, Vehicle, Driver, TripSchedule } from '../types'
import { useTheme } from '../contexts/ThemeContext'
import MapPicker from '../components/MapPicker'
import { MapPin } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

import { useAuth } from '../contexts/AuthContext'


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
  const [activePassengerIndex, setActivePassengerIndex] = useState<number | null>(null)
  const [activePassengerTab, setActivePassengerTab] = useState(0)
 const { user } = useAuth()
   const isSuperAdmin = user?.role === 'SUPER_ADMIN'
 const isAdmin = user?.role === 'ADMIN'
 const isSupervisor = user?.role === 'SUPERVISOR'

  const [showMap, setShowMap] = useState(false)
const [activeScheduleIndex, setActiveScheduleIndex] = useState<number | null>(null)
const [activeField, setActiveField] = useState<'starting_point' | 'end_point' | null>(null)

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 \
   bg-white dark:bg-gray-800 text-sm \
   focus:ring-2 focus:ring-primary-500 focus:border-primary-500 \
   outline-none transition-all duration-200";

  const [formData, setFormData] = useState({
  company_id: '',
  company_name: '',
  company_branch: '',
  schedules: [] as {
  id?: number            
  start_date: string
  end_date: string
  starting_point: string
  starting_lat?: number     // ADD
  starting_lng?: number     // ADD
  end_point: string
  end_lat?: number           // ADD
  end_lng?: number           // ADD
  start_time: string
  end_time: string
  way: 'one_way' | 'two_way'
  passengers?: {
    id : string
    name: string
    phone: string
    address: string
    start_point: string
    start_lat?: number
    start_lng?: number
    end_point: string
    end_lat?: number
    end_lng?: number
    timestamp?: string
    pickup?: boolean
  }[]
  passenger_count: number
  driver_id?: string
  driver_name?: string
  vehicle_id?: number
  vehicle_registration_number?: string
  trip_type: string
  notes?: string
  distance_km?: number      // ADD
  duration_min?: number
}[]

})

 const [deletedScheduleIds, setDeletedScheduleIds] = useState<number[]>([])

  const [companies, setCompanies] = useState<{ id: string; company_name: string; company_branch: string; agency_id: string }[]>([])

  useEffect(() => {
  const agencyId = localStorage.getItem('selectedAgencyId')
  if (!agencyId) return

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/companies/api/companies/trip/dropdown/?agency_id=${agencyId}`)
      
      setCompanies(res.data) // [{id, company_name}]
    } catch (err) {
      
      console.error('Failed to fetch companies', err)
    }
  }

  fetchCompanies()
}, [])

// useEffect(() => {
//   formData.schedules.forEach((s, index) => {
//     if (s.start_date && s.start_time) {
//       fetchDrivers(index)
//       fetchVehicles(index)
//     }
//   })
// }, [
//   formData.schedules.map(s => `${s.start_date}-${s.start_time}`).join('|')
// ])

useEffect(() => {
  formData.schedules.forEach((s, index) => {
    if (
      s.start_date &&
      s.end_date &&
      s.start_time &&
      s.end_time
    ) {
      fetchDrivers(index)
      fetchVehicles(index)
    }
  })

 
}, [
  formData.schedules
    .map(
      s =>
        `${s.end_time}`
    )
    .join('|')
])


const getAddressFromLatLng = async (lat: number, lng: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    )
    const data = await res.json()
    return data.display_name || `${lat}, ${lng}`
  } catch (err) {
    return `${lat}, ${lng}`
  }
}

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
      starting_lat: s.starting_lat,
      starting_lng: s.starting_lng,
      end_point: s.end_point || '',
      end_lat: s.end_lat,
      end_lng: s.end_lng,
      start_time: s.start_time || '',
      end_time: s.end_time || '',
      passenger_count: s.passenger_count || 0,
      driver_id: s.driver_id ?? undefined,
      vehicle_id: s.vehicle_id ?? undefined,
      vehicle_registration_number: s.vehicle_registration_number ?? '',
      driver_name: s.driver_name ?? '',
      trip_type: s.trip_type || '',
      notes: s.notes || '',
      way: (s.way || 'one_way') as 'one_way' | 'two_way',
      distance_km: s.distance_km,
      duration_min: s.duration_min,
      passengers: s.route_points ? s.route_points.map((p: any) => ({
        id : p.id,
        name: p.passenger_name || '',
        phone: p.passenger_phone || '',
        address: p.passenger_address || '',
        start_point: p.starting_point || '',
        start_lat: p.starting_lat,
        start_lng: p.starting_lng,
        end_point: p.end_point || '',
        end_lat: p.end_lat,
        end_lng: p.end_lng,
        timestamp: p.timestamp,
        pickup: p.pickup,
        })) : []
    })),
  })



  

  
}, [trip])


const fetchVehicles = async (scheduleIndex: number) => {
  const s = formData.schedules[scheduleIndex]

  if (
    !s.start_date ||
    !s.end_date ||
    !s.start_time ||
    !s.end_time
  ) {
    return
  }

  const token = localStorage.getItem('token') || ''

  try {
    const res = await axios.get(
                            
      'http://127.0.0.1:8000/api/vehicles/available/vehicles/',
      {
        params: {
          start_date: s.start_date,
          end_date: s.end_date,
          start_time: s.start_time,
          end_time: s.end_time,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    setVehicles(res.data)
  } catch (err) {
    console.error('Vehicle fetch failed', err)
  }
}



  

const fetchDrivers = async (scheduleIndex: number) => {
  const s = formData.schedules[scheduleIndex]

  if (
    !s.start_date ||
    !s.end_date ||
    !s.start_time ||
    !s.end_time
  ) {
    return
  }

  const token = localStorage.getItem('token') || ''

  try {
    const res = await axios.get(
      'http://127.0.0.1:8000/api/drivers/available/drivers/',
      {
        params: {
          start_date: s.start_date,
          end_date: s.end_date,
          start_time: s.start_time,
          end_time: s.end_time,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    setDrivers(res.data)
  } catch (err) {
    console.error('Driver fetch failed', err)
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
        start_date: '',
        end_date: '',
        starting_point: '',
        starting_lat: undefined,
        starting_lng: undefined,
        end_point: '',
        end_lat: undefined,
        end_lng: undefined,
        start_time: '',
        end_time: '',
        way: 'one_way',
        passenger_count: 0,
        driver_id: undefined,
        vehicle_id: undefined,
        trip_type: '',
        notes: '',
        distance_km: undefined,
        duration_min: undefined, // 👈 ADD
        passengers: [],   // 👈 VERY IMPORTANT
      },
    ],
  })
}


const updatePassengerCount = (scheduleIndex: number, count: number) => {
  const updated = [...formData.schedules]
  const s = updated[scheduleIndex]

  s.passenger_count = count

  if (s.trip_type === 'route') {
    s.passengers = Array.from({ length: count }, (_, i) => ({
      id : s.passengers?.[i]?.id || crypto.randomUUID(),
      name: s.passengers?.[i]?.name || '',
      phone: s.passengers?.[i]?.phone || '',
      address: s.passengers?.[i]?.address || '',
      start_point: s.passengers?.[i]?.start_point || '',
      start_lat: s.passengers?.[i]?.start_lat,   // ✅ KEEP
      start_lng: s.passengers?.[i]?.start_lng,   // ✅ KEEP
      end_point: s.passengers?.[i]?.end_point || '',
      end_lat: s.passengers?.[i]?.end_lat,       // ✅ KEEP
      end_lng: s.passengers?.[i]?.end_lng,       // ✅ KEEP
      pickup: s.passengers?.[i]?.pickup,       // ✅ KEEP
        timestamp: s.passengers?.[i]?.timestamp, // ✅ KEEP
    }))
  }

  setFormData({ ...formData, schedules: updated })
}





  const updateSchedule = (index: number, field: string, value: string | number | undefined) => {
    const updated = [...formData.schedules]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, schedules: updated })

    if(field === "vechile_id"){
      fetchVehicles(index)
    }
    else if(field === "driver_id"){
      fetchDrivers(index)
    }


  }

 
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
         starting_lat: s.starting_lat || null,
  starting_lng: s.starting_lng || null,
  end_lat: s.end_lat || null,
  end_lng: s.end_lng || null,
  distance_km: s.distance_km || null,
  duration_min: s.duration_min || null,

        route_points: s.passengers?.map(p => ({
          passenger_id: uuidv4(),
          passenger_name: p.name,
          passenger_phone: p.phone,
          passenger_address: p.address,
          starting_point: p.start_point,
          starting_lat: p.start_lat,
          starting_lng: p.start_lng,
          end_point: p.end_point,
          end_lat: p.end_lat,
          end_lng: p.end_lng,
          pickup:false,
          timestamp:  new Date().toISOString(),

        })) || []

      }

      console.log('Submitting schedule with payload: ' + JSON.stringify(payload, null, 2))

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

const selectClass =
  "w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 \
   bg-white dark:bg-gray-800 \
   text-gray-900 dark:text-white text-sm \
   focus:ring-2 focus:ring-primary-500 focus:border-primary-500 \
   outline-none transition-all duration-200";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`sticky top-0 ${headerColors.bg} px-6 py-4 flex justify-between items-center rounded-t-lg`}>
          <h2 className={`text-xl font-semibold ${headerColors.text}`}>
            {isSupervisor
    ? 'View Trip'
    : trip
    ? 'Edit Trip'
    : 'Add Trip'}
          </h2>
          <button
            onClick={onClose}
            className={`${headerColors.text} hover:opacity-70 transition-opacity`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

       <form
 onSubmit={(e) => {
    if (isSupervisor) {
      e.preventDefault()
      return
    }
    handleSubmit(e)
  }}
  className="max-w-6xl mx-auto bg-white dark:bg-gray-900
             rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800"
>

  
  <div className="p-8 space-y-8">
   

   
    {/* ================= HEADER ================= */}

    {
      !isSupervisor && (
         <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {trip ? 'Update Trip' : 'Create New Trip'}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage trip details and schedules
      </p>
    </div>
      )
    }
   

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
        disabled={isSupervisor}
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
        

        {!isSupervisor && (
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
)}
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
              {!isSupervisor && (
  <button
    type="button"
    onClick={() => removeSchedule(index)}
    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
  >
    <Trash2 className="h-4 w-4 text-red-600" />
  </button>
)}
            </div>

            {/* ===== Inputs ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['Start Date', 'date', 'start_date'],
                ['End Date', 'date', 'end_date'],

                ['Start Time', 'time', 'start_time'],
                ['End Time', 'time', 'end_time'],
              ].map(([label, type, field]) => (
                <div key={field}>
                  <label className="block text-xs font-medium mb-1">
                    {label}
                  </label>
                  <input
                  disabled={isSupervisor}
                    type={type}
                    value={(schedule as any)[field] || ''}
                    onChange={(e) =>
                      updateSchedule(index, field as any, e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium mb-1">Trip Way</label>
                <select
                disabled={isSupervisor}
                  value={schedule.way}
                  onChange={(e) => updateSchedule(index, 'way', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                >
                  <option value="one_way">One Way</option>
                  <option value="two_way">Two Way</option>
                </select>
              </div>

               <div>
  <label className="block text-xs font-medium mb-1">Trip Type</label>

  <select
  disabled={isSupervisor}
   className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
  value={schedule.trip_type}
  onChange={(e) => {
    const updated = [...formData.schedules]
    const s = updated[index]
 
    s.trip_type = e.target.value

    if (e.target.value === 'route') {
      const count = s.passenger_count || 0
      s.passengers = Array.from({ length: count }, (_, i) => ({
        id : "",
        name: '',
        phone: '',
        address: '',
        start_point: '',
        start_lat: undefined,
        start_lng: undefined,
        end_point: '',
        end_lat: undefined,
        end_lng: undefined,
        pickup: false,
        timestamp: '',
      }))
    } else {
      s.passengers = []
    }

    setFormData({ ...formData, schedules: updated })
  }}
>

    <option value="">Select Trip Type</option>
    
    <option value="shuttle">Shuttle</option>
    <option value="route">Route</option>
    
  </select>
</div>

              <div>
                <label className="block text-xs font-medium mb-1">Passengers</label>
                <input disabled={isSupervisor} className={inputClass}
  type="number"
  value={schedule.passenger_count}
  onChange={(e) =>
    updatePassengerCount(index, Number(e.target.value))
  }
/>

              </div>

             

{schedule.trip_type !== 'route' && (
  <>
    <div>
  <label className="block text-xs font-medium mb-1">
    Starting Point
  </label>

  <div className="relative">
    <input
    disabled={isSupervisor}
      type="text"
      readOnly  
      value={schedule.starting_point}
      onChange={(e) =>
        updateSchedule(index, 'starting_point', e.target.value)
      }
      placeholder="Select starting location"
      className={inputClass}
    />

    <button
      type="button"
      onClick={() => {
        setActiveScheduleIndex(index)
        setActiveField('starting_point')
        setShowMap(true)
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600"
      title="Pick location"
    >
      <MapPin size={18} />
    </button>
  </div>
</div>

<div>
  <label className="block text-xs font-medium mb-1">
    End Point
  </label>

  <div className="relative">
    <input
    disabled={isSupervisor}
      type="text"
      value={schedule.end_point}
      readOnly  
      onChange={(e) =>
        updateSchedule(index, 'end_point', e.target.value)
      }
      placeholder="Select ending location"
      className={inputClass}
    />

    <button
      type="button"
      onClick={() => {
        setActiveScheduleIndex(index)
        setActiveField('end_point')
        setShowMap(true)
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600"
      title="Pick location"
    >
      <MapPin size={18} />
    </button>
  </div>
</div>




  </>
)}






             {showMap && (
  <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center">
    <div className="bg-white dark:bg-gray-800 rounded-xl w-[90%] max-w-xl p-4">

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Select Location</h3>
        <button
          onClick={() => setShowMap(false)}
          className="text-sm text-red-500"
        >
          Close
        </button>
      </div>


<MapPicker
  mode={activeField}
  startPoint={
    activeScheduleIndex !== null
      ? (() => {
          const s = formData.schedules[activeScheduleIndex]

          // 🔥 ROUTE → PASSENGER
          if (s.trip_type === 'route' && activePassengerIndex !== null) {
            const p = s.passengers?.[activePassengerIndex]
            return p?.start_lat && p?.start_lng
              ? { lat: p.start_lat, lng: p.start_lng }
              : undefined
          }

          // 🔵 SHUTTLE / AMBULANCE → SCHEDULE
          return s.starting_lat && s.starting_lng
            ? { lat: s.starting_lat, lng: s.starting_lng }
            : undefined
        })()
      : undefined
  }
  endPoint={
    activeScheduleIndex !== null
      ? (() => {
          const s = formData.schedules[activeScheduleIndex]

          // 🔥 ROUTE → PASSENGER
          if (s.trip_type === 'route' && activePassengerIndex !== null) {
            const p = s.passengers?.[activePassengerIndex]
            return p?.end_lat && p?.end_lng
              ? { lat: p.end_lat, lng: p.end_lng }
              : undefined
          }

          // 🔵 SHUTTLE / AMBULANCE → SCHEDULE
          return s.end_lat && s.end_lng
            ? { lat: s.end_lat, lng: s.end_lng }
            : undefined
        })()
      : undefined
  }
  onSelect={async (lat, lng, distanceKm, durationMin) => {
    if (activeScheduleIndex === null || !activeField) return

    const address = await getAddressFromLatLng(lat, lng)
    const updated = [...formData.schedules]
    const s = updated[activeScheduleIndex]

    // 🔥 ROUTE – PASSENGER LEVEL
    if (s.trip_type === 'route' && activePassengerIndex !== null) {
      const p = s.passengers![activePassengerIndex]

      if (activeField === 'starting_point') {
        p.start_point = address
        p.start_lat = lat
        p.start_lng = lng
      } else {
        p.end_point = address
        p.end_lat = lat
        p.end_lng = lng
      }
    }

    // 🔵 SHUTTLE / AMBULANCE – SCHEDULE LEVEL
    else {
      if (activeField === 'starting_point') {
        s.starting_point = address
        s.starting_lat = lat
        s.starting_lng = lng
      } else {
        s.end_point = address
        s.end_lat = lat
        s.end_lng = lng
      }
    }

    // Distance only schedule-level
    if (distanceKm) s.distance_km = distanceKm
    if (durationMin) s.duration_min = durationMin

    setFormData({ ...formData, schedules: updated })
    setShowMap(false)
  }}
/>





    </div>
  </div>
)}



              <div>
                <label className="block text-xs font-medium mb-1">Select Driver</label>
                <select
                disabled={isSupervisor}
  value={schedule.driver_id || ''}

  onChange={(e) =>
   
    updateSchedule(index, 'driver_id', e.target.value)
  }
  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
>
  {
    schedule.driver_name ? (
      <option value="">{schedule.driver_name}</option>

    ) : 
    (
<option value="">Select Driver</option>
    )
  }
  
  
  

  {getAvailableDrivers(index).map((driver) => (
   <option key={driver.id} value={driver.id}>
  {driver.user.name}
</option>

  ))}
</select>

              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Select Vehicle</label>
                <select
                disabled={isSupervisor}
                    value={schedule.vehicle_id || ''}
      onChange={(e) => updateSchedule(index, 'vehicle_id', Number(e.target.value))}
    
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                >
                  {
                    schedule.vehicle_id ? (
                      <option value="">{schedule.vehicle_registration_number}</option>
                    ) : (
                      <option value="">Select Vehicle</option>
                    )
                  }
                 

                  
      {getAvailableVehicles(index).map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicle_registration_number} 
                          </option>
                        ))}
                </select> 

               

              </div>



              

              

              

            </div>

            {/* ===== Notes ===== */}
            <div className="mt-4">
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea
              disabled={isSupervisor}
                rows={2}
                value={schedule.notes || ''}
                onChange={(e) =>
                  updateSchedule(index, 'notes', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-700"
              />
            </div>



            {schedule.trip_type === 'route' &&
  schedule.passengers &&
  schedule.passengers.length > 0 && (

  <div className="mt-8">

    {/* ================= PASSENGER STEPPER ================= */}
    <div className="flex gap-3 overflow-x-auto mb-6 pb-2">
      {schedule.passengers.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setActivePassengerTab(i)}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all
            ${
              activePassengerTab === i
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
        >
         Passenger {i + 1}
        </button>
      ))}
    </div>

    {/* ================= ACTIVE PASSENGER ================= */}
    {(() => {
      const p = schedule.passengers![activePassengerTab]

      return (
        <div
          className="relative rounded-2xl border border-gray-200 dark:border-gray-700
                     bg-white/90 dark:bg-gray-900/90 backdrop-blur
                     p-6 shadow-xl"
        >

          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Passenger {activePassengerTab + 1}
            </h3>

            <span className="text-xs px-4 py-1 rounded-full
                             bg-indigo-100 text-indigo-700 font-medium">
              ROUTE TRIP
            </span>
          </div>

          {/* NAME & PHONE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Passenger Name
              </label>
              <input
              disabled={isSupervisor}
                type="text"
                value={p.name}
                onChange={(e) => {
                  const updated = [...formData.schedules]
                  updated[index].passengers![activePassengerTab].name = e.target.value
                  setFormData({ ...formData, schedules: updated })
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Phone Number
              </label>
              <input
              disabled={isSupervisor}
                type="text"
                value={p.phone}
                onChange={(e) => {
                  const updated = [...formData.schedules]
                  updated[index].passengers![activePassengerTab].phone = e.target.value
                  setFormData({ ...formData, schedules: updated })
                }}
                className={inputClass}
              />
            </div>
          </div>

          {/* LOCATION */}
          <div className="mt-8">
            <p className="text-xs text-gray-500 mb-3">
              Pickup & Drop Location
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* START POINT */}
              <button
                type="button"
                onClick={() => {
                  setActiveScheduleIndex(index)
                  setActivePassengerIndex(activePassengerTab)
                  setActiveField('starting_point')
                  setShowMap(true)
                }}
                className="rounded-xl border border-dashed border-indigo-400
                           p-4 text-left hover:bg-indigo-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100
                                  flex items-center justify-center">
                    📍
                  </div>
                  <div>
                    <p className="text-sm font-medium">Start Point</p>
                    <p className="text-xs text-gray-500 max-w-[220px] 
              break-words line-clamp-2">
  {p.start_point || 'Select pickup location'}
</p>

                  </div>
                </div>
              </button>

              {/* END POINT */}
              <button
                type="button"
                onClick={() => {
                  setActiveScheduleIndex(index)
                  setActivePassengerIndex(activePassengerTab)
                  setActiveField('end_point')
                  setShowMap(true)
                }}
                className="rounded-xl border border-dashed border-emerald-400
                           p-4 text-left hover:bg-emerald-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100
                                  flex items-center justify-center">
                    📍
                  </div>
                  <div>
                    <p className="text-sm font-medium">End Point</p>
                   <p className="text-xs text-gray-500 max-w-[220px] 
              break-words line-clamp-2">
  {p.end_point || 'Select drop location'}
</p>

                  </div>
                </div>
              </button>

            </div>
          </div>

        </div>
      )
    })()}
  </div>
)}






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

       {!isSupervisor && (
  <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 rounded-xl bg-primary-600 text-white
                   hover:bg-primary-700 shadow-md disabled:opacity-50"
      >
        {loading ? 'Saving...' : trip ? 'Update Trip' : 'Create Trip'}
      </button>
)}

      
    </div>

  </div>
</form>

      </div>
    </div>
  )
}

export default TripModal
