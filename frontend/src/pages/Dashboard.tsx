import { useEffect, useReducer, memo } from 'react'
import API from '../api/axiosConfig'
import { Car, Users } from 'lucide-react'
import { Vehicle, Driver, TripSchedule } from '../types'
import StatCard from '../components/dashboard/StatCard'
import RecentTripsSection from '../components/dashboard/RecentTripsSection'
import DocumentExpirySection from '../components/dashboard/DocumentExpirySection'
import EmergencyNotificationsSection from '../components/dashboard/EmergencyNotificationsSection'
import QuickActionsSection from '../components/dashboard/QuickActionsSection'

// Constants for magic numbers
const RECENT_TRIPS_LIMIT = 4
const EXPIRY_NOTIFICATIONS_LIMIT = 5

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

// Dashboard state management
interface DashboardState {
  stats: {
    vehicles: number
    drivers: number
    activeVehicles: number
    activeDrivers: number
  }
  recentTrips: TripSchedule[]
  documentExpiry: ExpiryNotification[]
  emergencyNotifications: EmergencyNotification[]
  loading: boolean
}

type DashboardAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STATS'; payload: DashboardState['stats'] }
  | { type: 'SET_RECENT_TRIPS'; payload: TripSchedule[] }
  | { type: 'SET_DOCUMENT_EXPIRY'; payload: ExpiryNotification[] }
  | { type: 'SET_EMERGENCY_NOTIFICATIONS'; payload: EmergencyNotification[] }
  | { type: 'RESET_DATA' }

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_STATS':
      return { ...state, stats: action.payload }
    case 'SET_RECENT_TRIPS':
      return { ...state, recentTrips: action.payload }
    case 'SET_DOCUMENT_EXPIRY':
      return { ...state, documentExpiry: action.payload }
    case 'SET_EMERGENCY_NOTIFICATIONS':
      return { ...state, emergencyNotifications: action.payload }
    case 'RESET_DATA':
      return {
        ...state,
        recentTrips: [],
        documentExpiry: [],
        emergencyNotifications: [],
        loading: false
      }
    default:
      return state
  }
}

const Dashboard = memo(() => {
  const initialState: DashboardState = {
    stats: {
      vehicles: 0,
      drivers: 0,
      activeVehicles: 0,
      activeDrivers: 0,
    },
    recentTrips: [],
    documentExpiry: [],
    emergencyNotifications: [],
    loading: true
  }
  
  const [state, dispatch] = useReducer(dashboardReducer, initialState)
  const { stats, recentTrips, documentExpiry, emergencyNotifications, loading } = state

  // Extracted function to fetch stats
  const fetchStats = async () => {
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        API.get('/vehicles/'),
        API.get('/drivers/'),
      ])

      const vehicles = vehiclesRes.data as Vehicle[]
      const drivers = driversRes.data as Driver[]

      dispatch({
        type: 'SET_STATS',
        payload: {
          vehicles: vehicles.length,
          drivers: drivers.length,
          activeVehicles: vehicles.filter((v) => v.is_active).length,
          activeDrivers: drivers.filter((d) => {
            // Normalize is_active to boolean to handle different data types
            const isActive = Boolean(Number(d.is_active));
            return isActive;
          }).length,
        }
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = async () => {
      try {
        await fetchStats()
      } catch (error) {
        console.error('Failed to update stats on notification:', error)
      }
    }

    window.addEventListener('notificationUpdate', handleNotificationUpdate)
    
    return () => {
      window.removeEventListener('notificationUpdate', handleNotificationUpdate)
    }
  }, [])

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchDashboardData = async () => {
      try {
        // Batch all API calls together for better performance
        const [vehiclesRes, driversRes, tripsRes, notificationsRes] = await Promise.allSettled([
          API.get('/vehicles/'),
          API.get('/drivers/'),
          API.get('/trip-schedules/'),
          API.get('/notifications/')
        ])
        
        // Check if component is still mounted
        if (abortController.signal.aborted) return

        // Handle vehicles and drivers (for stats)
        if (vehiclesRes.status === 'fulfilled' && driversRes.status === 'fulfilled') {
          const vehicles = vehiclesRes.value.data as Vehicle[]
          const drivers = driversRes.value.data as Driver[]

          if (!abortController.signal.aborted) {
            dispatch({
              type: 'SET_STATS',
              payload: {
                vehicles: vehicles.length,
                drivers: drivers.length,
                activeVehicles: vehicles.filter((v) => v.is_active).length,
                activeDrivers: drivers.filter((d) => {
                  // Normalize is_active to boolean to handle different data types
                  const isActive = Boolean(Number(d.is_active));
                  return isActive;
                }).length,
              }
            })
          }
        } else {
          console.warn('Failed to fetch vehicles or drivers:', { vehiclesRes, driversRes })
        }

        // Handle trips
        if (tripsRes.status === 'fulfilled') {
          const schedules = Array.isArray(tripsRes.value.data) ? tripsRes.value.data : []
          
          // Get recent trips (last RECENT_TRIPS_LIMIT)
          const recentSchedules = schedules
            .sort((a: TripSchedule, b: TripSchedule) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, RECENT_TRIPS_LIMIT)
          
          if (!abortController.signal.aborted) {
            dispatch({ type: 'SET_RECENT_TRIPS', payload: recentSchedules })
          }
        } else {
          console.warn('Failed to fetch trips:', tripsRes)
          if (!abortController.signal.aborted) {
            dispatch({ type: 'SET_RECENT_TRIPS', payload: [] })
          }
        }

        // Handle notifications
        if (notificationsRes.status === 'fulfilled') {
          const notifications = notificationsRes.value.data as ExpiryNotification[]
          
          // Get document expiry notifications (last EXPIRY_NOTIFICATIONS_LIMIT)
          // Filter out safety equipment notifications as they are handled separately in emergency section
          const expiryNotifications = notifications
            .filter((n: ExpiryNotification) => n.document_type !== 'fire_extinguisher' && n.document_type !== 'first_aid_kit' && n.document_type !== 'emergency_exit')
            .slice(0, EXPIRY_NOTIFICATIONS_LIMIT)
          
          if (!abortController.signal.aborted) {
            dispatch({ type: 'SET_DOCUMENT_EXPIRY', payload: expiryNotifications })
          }
        } else {
          console.warn('Failed to fetch notifications:', notificationsRes)
          if (!abortController.signal.aborted) {
            dispatch({ type: 'SET_DOCUMENT_EXPIRY', payload: [] })
          }
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        // Set default values if all APIs fail
        if (!abortController.signal.aborted) {
          dispatch({ type: 'RESET_DATA' })
        }
      } finally {
        if (!abortController.signal.aborted) {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      }
    }

    fetchDashboardData()
    
    return () => {
      // Cleanup function to abort ongoing requests
      abortController.abort()
    }
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
        {statCards.map((stat) => (
          <StatCard
            key={stat.name}
            name={stat.name}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            iconGradient={stat.iconGradient}
            bgGradient={stat.bgGradient}
          />
        ))}
      </div>

      {/* Three Sections in One Row */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentTripsSection recentTrips={recentTrips} />
        <DocumentExpirySection documentExpiry={documentExpiry} />
        <EmergencyNotificationsSection emergencyNotifications={emergencyNotifications} />
      </div>

      <QuickActionsSection />
    </div>
  )
})

export default Dashboard

