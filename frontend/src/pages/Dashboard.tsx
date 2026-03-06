import { useEffect, useState } from 'react'
import axios from 'axios'
import { Car, Users, AlertTriangle, MapPin, Wrench, User, DollarSign, FileText, Calendar, Bell } from 'lucide-react'
import { Vehicle, Driver, TripSchedule } from '../types'
import { useNavigate } from 'react-router-dom'

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

interface EmergencyNotification {
  id: string
  title: string
  description: string
  entity_name: string
  days_remaining: number
  severity: 'critical' | 'warning'
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    vehicles: 0,
    drivers: 0,
    activeVehicles: 0,
    activeDrivers: 0,
  })
  const [recentTrips, setRecentTrips] = useState<TripSchedule[]>([])
  const [documentExpiry, setDocumentExpiry] = useState<ExpiryNotification[]>([])
  const [emergencyNotifications, setEmergencyNotifications] = useState<EmergencyNotification[]>([])
  const [loading, setLoading] = useState(true)

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = () => {
      // Refetch stats to update any dashboard data if needed
      const fetchStats = async () => {
        try {
          const [vehiclesRes, driversRes] = await Promise.all([
            axios.get('/api/vehicles/'),
            axios.get('/api/drivers/'),
          ])

          const vehicles = vehiclesRes.data as Vehicle[]
          const drivers = driversRes.data as Driver[]

          setStats({
            vehicles: vehicles.length,
            drivers: drivers.length,
            activeVehicles: vehicles.filter((v) => v.is_active).length,
            activeDrivers: drivers.filter((d) => d.is_active).length,
          })
        } catch (error) {
          console.error('Failed to fetch stats:', error)
        }
      }
      fetchStats()
    }

    window.addEventListener('notificationUpdate', handleNotificationUpdate)
    
    return () => {
      window.removeEventListener('notificationUpdate', handleNotificationUpdate)
    }
  }, [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch vehicles and drivers first
        const [vehiclesRes, driversRes] = await Promise.all([
          axios.get('/api/vehicles/'),
          axios.get('/api/drivers/'),
        ])

        const vehicles = vehiclesRes.data as Vehicle[]
        const drivers = driversRes.data as Driver[]

        setStats({
          vehicles: vehicles.length,
          drivers: drivers.length,
          activeVehicles: vehicles.filter((v) => v.is_active).length,
          activeDrivers: drivers.filter((d) => d.is_active).length,
        })

        // Try to fetch trips and notifications separately with error handling
        try {
          const tripsRes = await axios.get('/api/trip-schedules/')
          const schedules = Array.isArray(tripsRes.data) ? tripsRes.data : []
          
          // Get recent trips (last 5)
          const recentSchedules = schedules
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
          setRecentTrips(recentSchedules)
        } catch (tripError) {
          console.warn('Failed to fetch trips:', tripError)
          setRecentTrips([])
        }

        try {
          const notificationsRes = await axios.get('/api/notifications/')
          const notifications = notificationsRes.data as ExpiryNotification[]
          
          // Get document expiry notifications (last 5)
          const expiryNotifications = notifications
            .filter((n: ExpiryNotification) => n.document_type !== 'fire_extinguisher' && n.document_type !== 'first_aid_kit' && n.document_type !== 'emergency_exit')
            .slice(0, 5)
          setDocumentExpiry(expiryNotifications)
        } catch (notificationError) {
          console.warn('Failed to fetch notifications:', notificationError)
          setDocumentExpiry([])
        }

        // Get emergency notifications (static data for now)
        const emergencyData: EmergencyNotification[] = [
          {
            id: '1',
            title: 'Fire Extinguisher Certificate',
            description: 'Fire safety certification expiring soon',
            entity_name: 'B 1234 CD',
            days_remaining: 3,
            severity: 'critical'
          },
          {
            id: '2',
            title: 'First Aid Kit Inspection',
            description: 'First aid kit needs inspection',
            entity_name: 'B 5678 EF',
            days_remaining: 5,
            severity: 'warning'
          },
          {
            id: '3',
            title: 'Emergency Exit Compliance',
            description: 'Emergency exit inspection required',
            entity_name: 'B 9012 GH',
            days_remaining: 8,
            severity: 'warning'
          }
        ]
        setEmergencyNotifications(emergencyData)

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        // Set default values if all APIs fail
        setRecentTrips([])
        setDocumentExpiry([])
        setEmergencyNotifications([])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    
    // Emit notification update event when component mounts to refresh the badge count
    window.dispatchEvent(new CustomEvent('notificationUpdate'))
  }, [])

  const statCards = [
    {
      name: 'Total Vehicles',
      value: stats.vehicles,
      icon: Car,
      gradient: 'from-blue-500 to-blue-600',
      iconGradient: 'from-blue-400 to-blue-500',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    },
    {
      name: 'Active Vehicles',
      value: stats.activeVehicles,
      icon: Car,
      gradient: 'from-green-500 to-green-600',
      iconGradient: 'from-green-400 to-green-500',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    },
    {
      name: 'Total Drivers',
      value: stats.drivers,
      icon: Users,
      gradient: 'from-purple-500 to-purple-600',
      iconGradient: 'from-purple-400 to-purple-500',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    },
    {
      name: 'Active Drivers',
      value: stats.activeDrivers,
      icon: Users,
      gradient: 'from-orange-500 to-orange-600',
      iconGradient: 'from-orange-400 to-orange-500',
      bgGradient: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className={`bg-gradient-to-br ${stat.bgGradient} rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-transparent hover:scale-105`}
            >
              <div className="flex items-center">
                <div className={`bg-gradient-to-br ${stat.iconGradient} p-3 rounded-lg shadow-md`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{stat.name}</p>
                  <p className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.gradient}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Three Sections in One Row */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Trips</h2>
            <button 
              onClick={() => navigate('/trips')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentTrips.slice(0, 4).map((trip) => (
              <div key={trip.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      TR-{trip.id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {trip.starting_point} -&gt; {trip.end_point}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    trip.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {trip.is_active ? 'In Progress' : 'Completed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Expiry Section */}
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
                  <AlertTriangle className={`h-4 w-4 ${
                    notification.days_remaining <= 15 ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {notification.document_type.charAt(0).toUpperCase() + notification.document_type.slice(1)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.entity_name}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${
                  notification.days_remaining <= 15 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {notification.days_remaining}d left
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Notification Section */}
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
                  <AlertTriangle className={`h-4 w-4 ${
                    notification.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notification.entity_name}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${
                  notification.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {notification.days_remaining}d left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/trips')}
            className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">New Trip</span>
          </button>
          <button
            onClick={() => navigate('/vehicles')}
            className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <Car className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Add Vehicle</span>
          </button>
          <button
            onClick={() => navigate('/drivers')}
            className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <User className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Add Driver</span>
          </button>
          <button
            onClick={() => navigate('/vehicles')}
            className="flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          >
            <Wrench className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Maintenance</span>
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="flex flex-col items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            <DollarSign className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Log Expense</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Generate Report</span>
          </button>
          <button
            onClick={() => navigate('/schedule')}
            className="flex flex-col items-center justify-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
          >
            <Calendar className="h-8 w-8 text-pink-600 dark:text-pink-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Schedule</span>
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Bell className="h-8 w-8 text-red-600 dark:text-red-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Alerts</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

