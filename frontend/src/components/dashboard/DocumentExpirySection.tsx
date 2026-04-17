import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

interface ExpiryNotification {
  id: string
  type: 'driver' | 'vehicle'
  title: string
  description: string
  expiry_date: string
  days_remaining: number
  severity: 'critical' | 'warning' | 'info'
  entity_id: string
  entity_name: string
  document_type: string
}

interface DocumentExpirySectionProps {
  documentExpiry: ExpiryNotification[]
}

const DocumentExpirySection = ({ documentExpiry }: DocumentExpirySectionProps) => {
  const navigate = useNavigate()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Document Expiry</h2>
        <button 
          onClick={() => navigate('/notifications')}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
        >
          View All
        </button>
      </div>
      <div className="space-y-3">
        {documentExpiry.map((notification) => (
          <div key={notification.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle 
                className={`h-4 w-4 ${
                  notification.days_remaining <= 15 ? 'text-red-500' : 'text-yellow-500'
                }`}
                aria-label={`${notification.days_remaining <= 15 ? 'Critical' : 'Warning'} alert`}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {notification.document_type 
                    ? notification.document_type.charAt(0).toUpperCase() + notification.document_type.slice(1)
                    : 'Document'
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.entity_name}</p>
              </div>
            </div>
            <span 
              className={`text-xs font-medium flex-shrink-0 ${
                notification.days_remaining <= 15 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}
              aria-label={`${notification.days_remaining <= 15 ? 'Critical' : 'Warning'}: ${notification.days_remaining} days remaining`}
            >
              {notification.days_remaining}d left
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DocumentExpirySection
