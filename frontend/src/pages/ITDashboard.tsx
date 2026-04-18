import { useEffect, useState } from 'react'
import axios from 'axios'
import { MapPin, Route, Calendar, Car } from 'lucide-react'
import { TripSchedule } from '../types'
import { useNavigate } from 'react-router-dom'

const ITDashboard = () => {
  const navigate = useNavigate()
  const [recentTrips, setRecentTrips] = useState<TripSchedule[]>([])
  const [stats, setStats] = useState({
    activeTrips: 0,
    totalTrips: 0,
    completedTrips: 0,
    vehiclesInUse: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchITDashboardData = async () => {
      try {
        // Fetch trips data
        const tripsRes = await axios.get('/api/trip-schedules/')
        const schedules = Array.isArray(tripsRes.data) ? tripsRes.data : []
        
        // Calculate stats
        const activeTrips = schedules.filter((trip: TripSchedule) => trip.is_active).length
        const completedTrips = schedules.filter((trip: TripSchedule) => !trip.is_active).length
        const uniqueVehicles = new Set(schedules.map((trip: TripSchedule) => trip.vehicle_id).filter(Boolean)).size
        
        setStats({
          activeTrips,
          totalTrips: schedules.length,
          completedTrips,
          vehiclesInUse: uniqueVehicles,
        })

        // Get recent trips (last 8)
        const recentSchedules = schedules
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8)
        setRecentTrips(recentSchedules)

      } catch (error) {
        console.error('Failed to fetch IT dashboard data:', error)
        setRecentTrips([])
      } finally {
        setLoading(false)
      }
    }

    fetchITDashboardData()
  }, [])

  const statCards = [
    {
      name: 'Active Trips',
      value: stats.activeTrips,
      icon: Route,
      gradient: 'from-green-500 to-green-600',
      iconGradient: 'from-green-400 to-green-500',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    },
    {
      name: 'Total Trips',
      value: stats.totalTrips,
      icon: Calendar,
      gradient: 'from-blue-500 to-blue-600',
      iconGradient: 'from-blue-400 to-blue-500',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    },
    {
      name: 'Completed Trips',
      value: stats.completedTrips,
      icon: MapPin,
      gradient: 'from-purple-500 to-purple-600',
      iconGradient: 'from-purple-400 to-purple-500',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    },
    {
      name: 'Vehicles in Use',
      value: stats.vehiclesInUse,
      icon: Car,
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Trip Management Dashboard</h1>

      {/* Trip Statistics */}
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

      {/* Recent Trips Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
          {recentTrips.slice(0, 6).map((trip) => (
            <div key={trip.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    TR-{trip.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {trip.starting_point} → {trip.end_point}
                  </p>
                  {trip.vehicle_registration_number && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Vehicle: {trip.vehicle_registration_number}
                    </p>
                  )}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  trip.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {trip.is_active ? 'Active' : 'Completed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ITDashboard
