import { useState, useEffect } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { Vehicle, VehicleType } from '../types'
import { useTheme } from '../contexts/ThemeContext'

type MenuColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'

interface VehicleModalProps {
  vehicle: Vehicle | null
  onClose: () => void
  onSuccess: () => void
}

const VehicleModal = ({ vehicle, onClose, onSuccess }: VehicleModalProps) => {
  const { menuColor } = useTheme()

  const getHeaderColorClasses = (color: MenuColor) => {
    const colorMap: Record<MenuColor, { bg: string; text: string }> = {
      blue: {
        bg: 'bg-blue-600 dark:bg-blue-700',
        text: 'text-white',
      },
      green: {
        bg: 'bg-green-600 dark:bg-green-700',
        text: 'text-white',
      },
      purple: {
        bg: 'bg-purple-600 dark:bg-purple-700',
        text: 'text-white',
      },
      orange: {
        bg: 'bg-orange-600 dark:bg-orange-700',
        text: 'text-white',
      },
      red: {
        bg: 'bg-red-600 dark:bg-red-700',
        text: 'text-white',
      },
      indigo: {
        bg: 'bg-indigo-600 dark:bg-indigo-700',
        text: 'text-white',
      },
    }
    return colorMap[color] || colorMap.blue
  }

  const headerColors = getHeaderColorClasses(menuColor)

  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: 'sedan' as VehicleType,
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    seating_capacity: 4,
    registration_number: '',
    insurance_number: '',
    insurance_expiry: '',
    notes: '',
    is_active: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vehicle_number: vehicle.vehicle_number,
        vehicle_type: vehicle.vehicle_type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || '',
        seating_capacity: vehicle.seating_capacity,
        registration_number: vehicle.registration_number,
        insurance_number: vehicle.insurance_number || '',
        insurance_expiry: vehicle.insurance_expiry
          ? new Date(vehicle.insurance_expiry).toISOString().split('T')[0]
          : '',
        notes: vehicle.notes || '',
        is_active: vehicle.is_active,
      })
    }
  }, [vehicle])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]:
        type === 'number'
          ? parseInt(value)
          : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        ...formData,
        insurance_expiry: formData.insurance_expiry || null,
      }

      if (vehicle) {
        await axios.put(`/api/vehicles/${vehicle.id}`, payload)
      } else {
        await axios.post('/api/vehicles/', payload)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save vehicle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`sticky top-0 ${headerColors.bg} px-6 py-4 flex justify-between items-center rounded-t-lg`}>
          <h2 className={`text-xl font-semibold ${headerColors.text}`}>
            {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          </h2>
          <button
            onClick={onClose}
            className={`${headerColors.text} hover:opacity-70 transition-opacity`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle Number *
              </label>
              <input
                type="text"
                name="vehicle_number"
                required
                value={formData.vehicle_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle Type *
              </label>
              <select
                name="vehicle_type"
                required
                value={formData.vehicle_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="bus">Bus</option>
                <option value="mini_bus">Mini Bus</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Make *</label>
              <input
                type="text"
                name="make"
                required
                value={formData.make}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model *</label>
              <select
                name="model"
                required
                value={formData.model}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Model</option>
                <option value="Patrol">Patrol</option>
                <option value="Diesel">Diesel</option>
                <option value="EV">EV</option>
                <option value="CNG">CNG</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year *</label>
              <input
                type="number"
                name="year"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Seating Capacity *
              </label>
              <input
                type="number"
                name="seating_capacity"
                required
                min="1"
                value={formData.seating_capacity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Registration Number *
              </label>
              <input
                type="text"
                name="registration_number"
                required
                value={formData.registration_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Insurance Number
              </label>
              <input
                type="text"
                name="insurance_number"
                value={formData.insurance_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Insurance Expiry
              </label>
              <input
                type="date"
                name="insurance_expiry"
                value={formData.insurance_expiry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {vehicle && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          )}

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
              {loading ? 'Saving...' : vehicle ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VehicleModal

