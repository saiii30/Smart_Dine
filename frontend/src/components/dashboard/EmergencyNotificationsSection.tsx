import { AlertTriangle } from 'lucide-react'

interface EmergencyNotification {
  id: string
  title: string
  description: string
  entity_name: string
  days_remaining: number
  severity: 'critical' | 'warning'
}

interface EmergencyNotificationsSectionProps {
  emergencyNotifications: EmergencyNotification[]
}

const EmergencyNotificationsSection = ({ emergencyNotifications }: EmergencyNotificationsSectionProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Emergency Notification</h2>
        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
          View All
        </button>
      </div>
      <div className="space-y-3">
        {emergencyNotifications.map((notification) => (
          <div key={notification.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle 
                className={`h-4 w-4 ${
                  notification.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`}
                aria-label={`${notification.severity === 'critical' ? 'Critical' : 'Warning'} emergency alert`}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {notification.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.entity_name}</p>
              </div>
            </div>
            <span 
              className={`text-xs font-medium flex-shrink-0 ${
                notification.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}
              aria-label={`${notification.severity === 'critical' ? 'Critical' : 'Warning'} emergency: ${notification.days_remaining} days remaining`}
            >
              {notification.days_remaining}d left
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EmergencyNotificationsSection
