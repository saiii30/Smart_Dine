import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Plus, Trash2 } from 'lucide-react'
import { Trip, Vehicle, Driver, TripSchedule } from '../types'
import { useTheme } from '../contexts/ThemeContext'

type MenuColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'

interface TripModalProps {
  trip: Trip | null
  onClose: () => void
  onSuccess: () => void
}

const TripModal = ({ trip, onClose, onSuccess }: TripModalProps) => {
  const { menuColor } = useTheme()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    company_name: '',
    name: '',
    address: '',
    schedules: [] as Omit<TripSchedule, 'id' | 'trip_id' | 'created_at' | 'updated_at' | 'vehicle_number' | 'driver_name'>[],
  })

  useEffect(() => {
    fetchVehicles()
    fetchDrivers()
  }, [])

  useEffect(() => {
    if (trip) {
      setFormData({
        company_name: trip.company_name || '',
        name: trip.name,
        address: trip.address || '',
        schedules: trip.schedules.map(s => ({
          destination: s.destination,
          departure_datetime: s.departure_datetime ? new Date(s.departure_datetime).toISOString().slice(0, 16) : '',
          vehicle_id: s.vehicle_id || undefined,
          driver_id: s.driver_id || undefined,
          passenger_count: s.passenger_count,
          notes: s.notes || '',
        })),
      })
    }
  }, [trip])

  const fetchVehicles = async () => {
    try {
      const response = await axios.get('/api/vehicles/')
      setVehicles(response.data.filter((v: Vehicle) => v.is_active))
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    }
  }

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('/api/drivers/')
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedules: [...formData.schedules, { 
        destination: '', 
        departure_datetime: '', 
        vehicle_id: undefined,
        driver_id: undefined,
        passenger_count: 0, 
        notes: '' 
      }],
    })
  }

  const removeSchedule = (index: number) => {
    setFormData({
      ...formData,
      schedules: formData.schedules.filter((_, i) => i !== index),
    })
  }

  const updateSchedule = (index: number, field: string, value: string | number | undefined) => {
    const updated = [...formData.schedules]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, schedules: updated })
  }

  // Get available vehicles/drivers (not already assigned to another schedule at the same time)
  const getAvailableVehicles = (scheduleIndex: number) => {
    const currentSchedule = formData.schedules[scheduleIndex]
    if (!currentSchedule.departure_datetime) return vehicles

    return vehicles.filter(vehicle => {
      // Check if vehicle is already assigned to another schedule at this time
      const isAssigned = formData.schedules.some((s, idx) => 
        idx !== scheduleIndex && 
        s.vehicle_id === vehicle.id && 
        s.departure_datetime === currentSchedule.departure_datetime
      )
      return !isAssigned
    })
  }

  const getAvailableDrivers = (scheduleIndex: number) => {
    const currentSchedule = formData.schedules[scheduleIndex]
    if (!currentSchedule.departure_datetime) return drivers

    return drivers.filter(driver => {
      // Check if driver is already assigned to another schedule at this time
      const isAssigned = formData.schedules.some((s, idx) => 
        idx !== scheduleIndex && 
        s.driver_id === driver.id && 
        s.departure_datetime === currentSchedule.departure_datetime
      )
      return !isAssigned
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        company_name: formData.company_name,
        name: formData.name,
        address: formData.address || null,
        schedules: formData.schedules.map(s => ({
          destination: s.destination,
          departure_datetime: s.departure_datetime ? new Date(s.departure_datetime).toISOString() : null,
          vehicle_id: s.vehicle_id || null,
          driver_id: s.driver_id || null,
          passenger_count: s.passenger_count,
          notes: s.notes || null,
        })),
      }

      if (trip) {
        await axios.put(`/api/trips/${trip.id}`, {
          company_name: payload.company_name,
          name: payload.name,
          address: payload.address,
        })
        
        // Delete all existing schedules and recreate
        for (const scheduleId of trip.schedules.map(s => s.id)) {
          try {
            await axios.delete(`/api/trips/schedules/${scheduleId}`)
          } catch (err) {
            // Ignore if already deleted
          }
        }
        
        for (const schedule of payload.schedules) {
          await axios.post(`/api/trips/${trip.id}/schedules/`, schedule)
        }
      } else {
        await axios.post('/api/trips/', payload)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save trip')
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                name="company_name"
                required
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Enter company name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trip Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {trip && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trip ID
                </label>
                <input
                  type="text"
                  value={trip.trip_code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <textarea
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Trip Schedules */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trip Schedules
                </label>
                {trip && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Trip ID: {trip.trip_code}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={addSchedule}
                className="flex items-center px-3 py-1 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Schedule
              </button>
            </div>
            <div className="space-y-3">
              {formData.schedules.map((schedule, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Schedule {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeSchedule(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Destination *</label>
                      <input
                        type="text"
                        required
                        value={schedule.destination}
                        onChange={(e) => updateSchedule(index, 'destination', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Departure Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={schedule.departure_datetime}
                        onChange={(e) => updateSchedule(index, 'departure_datetime', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Vehicle</label>
                      <select
                        value={schedule.vehicle_id || ''}
                        onChange={(e) => updateSchedule(index, 'vehicle_id', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Driver</label>
                      <select
                        value={schedule.driver_id || ''}
                        onChange={(e) => updateSchedule(index, 'driver_id', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Passenger Count</label>
                      <input
                        type="number"
                        min="0"
                        value={schedule.passenger_count}
                        onChange={(e) => updateSchedule(index, 'passenger_count', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={schedule.notes || ''}
                      onChange={(e) => updateSchedule(index, 'notes', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : trip ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TripModal
