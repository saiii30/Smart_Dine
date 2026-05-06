import { X } from 'lucide-react'
import { Vehicle } from '../types'
import { api } from '../api/api'

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

  const handleViewDocument = async (documentType: string) => {
    if (vehicle && vehicle.id && documentType && documentType.trim() !== '') {
      try {
        // Use the authenticated API client to fetch the document
        const response = await api.get(`/vehicles/${vehicle.id}/documents/${documentType}`, {
          responseType: 'blob' // Important for file downloads
        })
        
        // Create a blob URL and open in new tab
        const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
        
        // Clean up the blob URL after a short delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
        }, 1000)
      } catch (error) {
        console.error('Error viewing document:', error)
        // Fallback to direct window.open if API fails
        const baseUrl = window.location.origin
        const fullUrl = `${baseUrl}/api/vehicles/${vehicle.id}/documents/${documentType}`
        window.open(fullUrl, '_blank')
      }
    }
  }

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

          {vehicle.fire_extinguisher_expiry && vehicle.fire_extinguisher_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Fire Extinguisher Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.fire_extinguisher_expiry).toLocaleDateString('en-GB')}
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

          {vehicle.first_aid_kit_expiry && vehicle.first_aid_kit_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">First Aid Kit Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.first_aid_kit_expiry).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.toolkit_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Toolkit Available:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.toolkit_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.toolkit_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.spare_wheel_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Spare Wheel Available:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.spare_wheel_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.spare_wheel_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.emergency_sticker_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Emergency Contact Stickers:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.emergency_sticker_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.emergency_sticker_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.reflective_triangle_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Reflective Triangle:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.reflective_triangle_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.reflective_triangle_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.torch_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Torch Available:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.torch_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.torch_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.umbrella_available !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Umbrella Available:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.umbrella_available 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.umbrella_available ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.speed_governor_installed !== undefined && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Speed Governor Installed:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                vehicle.speed_governor_installed 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
                {vehicle.speed_governor_installed ? 'Yes' : 'No'}
              </span>
            </div>
          )}

          {vehicle.emergency_support_number && vehicle.emergency_support_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Emergency Support Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.emergency_support_number}</span>
            </div>
          )}

          {vehicle.permit_number && vehicle.permit_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Permit Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{vehicle.permit_number}</span>
            </div>
          )}

          {vehicle.permit_expiry && vehicle.permit_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Permit Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.permit_expiry).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.fitness_certificate_date && vehicle.fitness_certificate_date.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Fitness Certificate Date:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.fitness_certificate_date).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {vehicle.fitness_certificate_expiry && vehicle.fitness_certificate_expiry.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Fitness Certificate Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(vehicle.fitness_certificate_expiry).toLocaleDateString('en-GB')}
              </span>
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

          {/* Documents Section */}
          {(vehicle.pollution_certificate || vehicle.insurance_copy || vehicle.policy_certificate || vehicle.registration_certificate) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents</h3>
              <div className="space-y-3">
                {vehicle.pollution_certificate && vehicle.pollution_certificate.trim() !== '' && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Pollution Certificate:</span>
                    <button
                      onClick={() => handleViewDocument('pollution')}
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      View
                    </button>
                  </div>
                )}

                {vehicle.insurance_copy && vehicle.insurance_copy.trim() !== '' && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Insurance Copy:</span>
                    <button
                      onClick={() => handleViewDocument('insurance')}
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      View
                    </button>
                  </div>
                )}

                {vehicle.policy_certificate && vehicle.policy_certificate.trim() !== '' && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Policy Certificate:</span>
                    <button
                      onClick={() => handleViewDocument('policy')}
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      View
                    </button>
                  </div>
                )}

                {vehicle.registration_certificate && vehicle.registration_certificate.trim() !== '' && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Registration Certificate:</span>
                    <button
                      onClick={() => handleViewDocument('registration')}
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      View
                    </button>
                  </div>
                )}
              </div>
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
