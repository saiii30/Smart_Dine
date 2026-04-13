import { useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, Clock, Calendar, ExternalLink } from 'lucide-react'

interface NotificationItem {
  id: string
  type: 'driver' | 'vehicle'
  title: string
  description: string
  expiryDate: string
  daysRemaining: number
  severity: 'critical' | 'warning' | 'info'
  entityName: string
  documentType: string
}

interface NotificationPopupProps {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationItem[]
  totalCount: number
}

const NotificationPopup = ({ isOpen, onClose, notifications, totalCount }: NotificationPopupProps) => {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      case 'warning':
        return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
      case 'info':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
      default:
        return 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'warning':
        return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case 'info':
        return <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      default:
        return <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getDaysRemainingColor = (days: number) => {
    if (days <= 10) return 'text-red-600 dark:text-red-400 font-semibold'
    if (days <= 20) return 'text-orange-600 dark:text-orange-400 font-medium'
    if (days <= 30) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-blue-600 dark:text-blue-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed top-16 right-4 z-50 w-96 max-h-96 overflow-hidden">
      <div
        ref={popupRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            {totalCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {totalCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close notifications"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getSeverityColor(notification.severity)} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer`}
                >
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(notification.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {notification.entityName} • {notification.documentType}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {notification.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${getDaysRemainingColor(notification.daysRemaining)}`}>
                          {notification.daysRemaining} days left
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(notification.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {notifications.length > 5 && (
                <div className="p-3 text-center">
                  <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center justify-center mx-auto">
                    View all {notifications.length} notifications
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationPopup
