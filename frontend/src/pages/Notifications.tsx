import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/api'
import { Bell, AlertTriangle, Calendar, CarTaxiFront, Users, Search, Clock, CheckCircle } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

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

const Notifications = () => {
  const { expirySettings } = useSettings()
  const [notifications, setNotifications] = useState<ExpiryNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('')

  // Map frontend document IDs to backend document types
  const documentTypeMapping: Record<string, string> = {
    'driving_license': 'driving license',
    'insurance': 'insurance',
    'puc_certificate': 'puc certificate',
    'registration_certificate': 'registration certificate',
    'service_due': 'service due'
  }

  // Reverse mapping for backend to frontend
  const reverseDocumentTypeMapping: Record<string, string> = {}
  Object.entries(documentTypeMapping).forEach(([frontendId, backendType]) => {
    reverseDocumentTypeMapping[backendType] = frontendId
  })

  useEffect(() => {
    fetchNotifications()
    
    // Emit notification update event when component mounts to refresh the badge count
    window.dispatchEvent(new CustomEvent('notificationUpdate'))
    
    // Set up periodic refresh every 10 seconds for shared acknowledgements
    const interval = setInterval(fetchNotifications, 1800000)
    
    return () => clearInterval(interval)
  }, [selectedType, selectedSeverity])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType) params.append('type', selectedType)
      if (selectedSeverity) params.append('severity', selectedSeverity)
      
      const response = await api.get(`/notifications/?${params.toString()}`)
      setNotifications(response.data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = useMemo(() => {
    let filtered = notifications
    
    // Apply settings-based filtering
    // 1. Filter by expiry days (only show notifications within the configured days)
    filtered = filtered.filter(notification => {
      const notificationDocType = notification.document_type.toLowerCase()
      const frontendDocId = reverseDocumentTypeMapping[notificationDocType] || notificationDocType
      const specificDays = expirySettings.documentExpiryDays[frontendDocId]
      const daysToUse = specificDays || expirySettings.globalExpiryDays
      return notification.days_remaining <= daysToUse
    })
    
    // 2. Filter by entity type (vehicle/driver notifications enabled)
    if (!expirySettings.vehicleNotificationsEnabled) {
      filtered = filtered.filter(notification => notification.type !== 'vehicle')
    }
    if (!expirySettings.driverNotificationsEnabled) {
      filtered = filtered.filter(notification => notification.type !== 'driver')
    }
    
    // 3. Filter by selected document types with smart logic
    if (expirySettings.selectedDocumentTypes.length > 0) {
      // If specific documents are selected, show only those
      console.log('Selected document types:', expirySettings.selectedDocumentTypes)
      console.log('Available notifications:', notifications.map(n => ({ id: n.id, type: n.document_type, type_lower: n.document_type.toLowerCase() })))
      
      filtered = filtered.filter(notification => {
        const notificationDocType = notification.document_type.toLowerCase()
        const frontendDocId = reverseDocumentTypeMapping[notificationDocType] || notificationDocType
        const isSelected = expirySettings.selectedDocumentTypes.includes(frontendDocId)
        console.log(`Notification "${notification.document_type}" (${frontendDocId}) selected:`, isSelected)
        return isSelected
      })
    } else {
      // If no specific documents selected, show all enabled entity types
      // This handles the "Vehicle enabled shows all vehicle documents" case
      if (expirySettings.vehicleNotificationsEnabled) {
        // Keep all vehicle notifications
      } else {
        // Remove vehicle notifications if vehicle is disabled
        filtered = filtered.filter(notification => notification.type !== 'vehicle')
      }
      
      if (expirySettings.driverNotificationsEnabled) {
        // Keep all driver notifications
      } else {
        // Remove driver notifications if driver is disabled
        filtered = filtered.filter(notification => notification.type !== 'driver')
      }
    }
    
    // Apply existing filters
    if (searchQuery) {
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.document_type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (selectedType) {
      filtered = filtered.filter(notification => notification.type === selectedType)
    }
    
    if (selectedSeverity) {
      filtered = filtered.filter(notification => notification.severity === selectedSeverity)
    }
    
    return filtered
  }, [notifications, searchQuery, selectedType, selectedSeverity, expirySettings])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800'
      case 'info':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
      case 'warning':
        return <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      case 'info':
        return <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      default:
        return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'driver' ? 
      <Users className="h-5 w-5" /> : 
      <CarTaxiFront className="h-5 w-5" />
  }

  const getDaysRemainingColor = (days: number) => {
    if (days <= 10) return 'text-red-600 dark:text-red-400 font-semibold'
    if (days <= 20) return 'text-orange-600 dark:text-orange-400 font-medium'
    if (days <= 30) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-blue-600 dark:text-blue-400'
  }

  const handleAcknowledgeNotification = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Emit custom event to update notification count in Layout
      window.dispatchEvent(new CustomEvent('notificationUpdate'))
    } catch (error) {
      console.error('Failed to acknowledge notification:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <div className="flex flex-1 md:max-w-2xl items-center gap-4 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Types</option>
            <option value="driver">Drivers</option>
            <option value="vehicle">Vehicles</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Settings Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Active Filter Settings
            </h3>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-blue-700 dark:text-blue-300">
              <span>
                <strong>Default Alert:</strong> Within {expirySettings.globalExpiryDays} days
              </span>
              <span>
                <strong>Vehicle Alerts:</strong> {expirySettings.vehicleNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <span>
                <strong>Driver Alerts:</strong> {expirySettings.driverNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
              {expirySettings.selectedDocumentTypes.length > 0 ? (
                <span>
                  <strong>Specific Documents:</strong> {expirySettings.selectedDocumentTypes.map(id => {
                    const docType = documentTypeMapping[id] || id
                    return docType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  }).join(', ')}
                </span>
              ) : (
                <span>
                  <strong>Filter Mode:</strong> All enabled entity types
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              These filters are applied from your Settings page. 
              <a href="/settings" className="underline hover:no-underline ml-1">
                Configure settings
              </a>
            </p>
          </div>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() || selectedType || selectedSeverity ? 'No notifications found' : 'No notifications'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery.trim() || selectedType || selectedSeverity
              ? 'Try adjusting your search criteria.'
              : 'All documents are up to date!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-2 ${getSeverityColor(notification.severity)}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(notification.severity)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {notification.document_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {getTypeIcon(notification.type)}
                  <span className="text-xs font-medium capitalize text-gray-600 dark:text-gray-400">
                    {notification.type}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {notification.description}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Entity:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                    {notification.entity_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expiry Date:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {notification.expiry_date ? new Date(notification.expiry_date).toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric', 
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Days Remaining:
                  </span>
                  <span className={`text-sm ${getDaysRemainingColor(notification.days_remaining)}`}>
                    {notification.days_remaining} days
                  </span>
                </div>
              </div>

              {/* Say Acknowledgement Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleAcknowledgeNotification(notification.id)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Say Acknowledgement
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
