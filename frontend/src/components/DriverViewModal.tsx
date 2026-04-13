import { X } from 'lucide-react'
import { Driver } from '../types'

interface DriverViewModalProps {
  driver: Driver | null
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

const DriverViewModal = ({ driver, onClose }: DriverViewModalProps) => {
  if (!driver) return null

  return (
    <>
      <style>{customScrollbarStyles}</style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Driver Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Driver Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Full Name:</span>
            <span className="text-gray-900 dark:text-white font-medium">{driver.user.name}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Phone Number:</span>
            <span className="text-gray-900 dark:text-white font-medium">{driver.user.contact_number}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Password:</span>
            <span className="text-gray-900 dark:text-white font-medium">{"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Date of Birth:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {driver.date_of_birth && driver.date_of_birth.trim() !== '' ? new Date(driver.date_of_birth).toLocaleDateString('en-GB') : 'N/A'}
            </span>
          </div>

          {driver.gender && driver.gender.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Gender:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.gender}</span>
            </div>
          )}

          {driver.blood_group && driver.blood_group.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Blood Group:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.blood_group}</span>
            </div>
          )}

          {driver.languages_spoken && driver.languages_spoken.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Languages Spoken:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.languages_spoken}</span>
            </div>
          )}

          {driver.shift_preference && driver.shift_preference.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Shift Preference:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.shift_preference}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Status:</span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              driver.status === 'Active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            }`}>
              {driver.status || 'Active'}
            </span>
          </div>

          {/* Additional Details */}
          {driver.driving_license_number && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">License Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.driving_license_number}</span>
            </div>
          )}

          {driver.license_expiry_date && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">License Expiry:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(driver.license_expiry_date).toLocaleDateString('en-GB')}
              </span>
            </div>
          )}

          {driver.emergency_contact_name && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Emergency Contact:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.emergency_contact_name}</span>
            </div>
          )}

          {driver.emergency_contact_number && driver.emergency_contact_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Emergency Contact Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.emergency_contact_number}</span>
            </div>
          )}

          {driver.previous_employer_experience && driver.previous_employer_experience.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Previous Employer Experience:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.previous_employer_experience}</span>
            </div>
          )}

          {driver.current_address && driver.current_address.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Current Address:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.current_address}</span>
            </div>
          )}

          {driver.city && driver.city.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">City:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.city}</span>
            </div>
          )}

          {driver.state && driver.state.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">State:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.state}</span>
            </div>
          )}

          {driver.pincode && driver.pincode.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Pincode:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.pincode}</span>
            </div>
          )}

          {driver.aadhar_number && driver.aadhar_number.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Aadhar Number:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.aadhar_number}</span>
            </div>
          )}

          {driver.verification_status && driver.verification_status.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Verification Status:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.verification_status}</span>
            </div>
          )}

          {driver.assigned_vehicle_id && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Assigned Vehicle ID:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.assigned_vehicle_id}</span>
            </div>
          )}

          {driver.notes && driver.notes.trim() !== '' && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Notes:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.notes}</span>
            </div>
          )}

          {driver.user.email && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Email:</span>
              <span className="text-gray-900 dark:text-white font-medium">{driver.user.email}</span>
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

export default DriverViewModal
