import { X } from 'lucide-react'
import { Vehicle } from '../types'

interface VehicleViewModalProps {
  vehicle: Vehicle | null
  onClose: () => void
}

// Custom scrollbar styles
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1f;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-track {
    background: #374151;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #6b7280;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`

const VehicleViewModal = ({ vehicle, onClose }: VehicleViewModalProps) => {
  if (!vehicle) return null

  return (
    <>
      <style>{customScrollbarStyles}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Vehicle Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Vehicle Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Registration Number:</span>
            <span className="text-gray-900 dark:text-white font-medium">{vehicle.vehicle_registration_number}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Brand:</span>
            <span className="text-gray-900 dark:text-white font-medium">{vehicle.vehicle_brand}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Model:</span>
            <span className="text-gray-900 dark:text-white font-medium">{vehicle.vehicle_model}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Manufacturing Year:</span>
            <span className="text-gray-900 dark:text-white font-medium">{vehicle.manufacturing_year}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Vehicle Type:</span>
            <span className="text-gray-900 dark:text-white font-medium">{vehicle.vehicle_type.replace('_', ' ').toUpperCase()}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Seating Capacity:</span>
            <span className="text-gray-900 dark:text-white font-medium">{vehicle.seating_capacity} seats</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Fuel Type:</span>
            <span className="text-gray-900 dark:text-white font-medium">{vehicle.fuel_type || 'N/A'}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Status:</span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              vehicle.is_active 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            }`}>
              {vehicle.vehicle_status}
            </span>
          </div>

          {/* Additional Details - Only show if field has value */}
          {vehicle.color && vehicle.color.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Color:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.color}</span>
            </div>
          )}

          {vehicle.insurance_expiry && vehicle.insurance_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Insurance Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.insurance_expiry).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.puc_expiry && vehicle.puc_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Pollution Certificate Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.puc_expiry).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.service_expiry && vehicle.service_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Service Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.service_expiry).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.registration_expiry && vehicle.registration_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Registration Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.registration_expiry).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.vehicle_number && vehicle.vehicle_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Vehicle Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.vehicle_number}</span>
            </div>
          )}

          {vehicle.rc_number && vehicle.rc_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">RC Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.rc_number}</span>
            </div>
          )}

          {vehicle.gps_device_id && vehicle.gps_device_id.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">GPS Device ID:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.gps_device_id}</span>
            </div>
          )}

          {vehicle.make && vehicle.make.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Make:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.make}</span>
            </div>
          )}

          {vehicle.model && vehicle.model.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Model:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.model}</span>
            </div>
          )}

          {vehicle.insurance_number && vehicle.insurance_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Insurance Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.insurance_number}</span>
            </div>
          )}

          {vehicle.insurance_date && vehicle.insurance_date.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Insurance Date:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.insurance_date).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.insurance_renewal_date && vehicle.insurance_renewal_date.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Insurance Renewal Date:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.insurance_renewal_date).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.registration_date && vehicle.registration_date.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Registration Date:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.registration_date).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.pollution_certificate && vehicle.pollution_certificate.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Pollution Certificate:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.pollution_certificate}</span>
            </div>
          )}

          {vehicle.fire_extinguisher_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Fire Extinguisher Available:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.fire_extinguisher_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.fire_extinguisher_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.first_aid_kit_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">First Aid Kit Available:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.first_aid_kit_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.first_aid_kit_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.emergency_support_number && vehicle.emergency_support_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Emergency Support Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.emergency_support_number}</span>
            </div>
          )}

          {vehicle.category && vehicle.category.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Category:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.category}</span>
            </div>
          )}

          {vehicle.owner_name && vehicle.owner_name.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Owner Name:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.owner_name}</span>
            </div>
          )}

          {vehicle.ownership_type && vehicle.ownership_type.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Ownership Type:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.ownership_type}</span>
            </div>
          )}

          {vehicle.assigned_driver_id && vehicle.assigned_driver_id.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Assigned Driver ID:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.assigned_driver_id}</span>
            </div>
          )}

          {vehicle.notes && vehicle.notes.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Notes:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.notes}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
</>
  )
}

export default VehicleViewModal
