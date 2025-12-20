import { useEffect, useState } from 'react'
import axios from 'axios'
import { Car, Users } from 'lucide-react'
import { Vehicle, Driver } from '../types'

const Dashboard = () => {
  const [stats, setStats] = useState({
    vehicles: 0,
    drivers: 0,
    activeVehicles: 0,
    activeDrivers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
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

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Welcome to TMS</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your vehicles and drivers efficiently. Use the navigation menu to add new
          vehicles and drivers, or view existing ones.
        </p>
      </div>
    </div>
  )
}

export default Dashboard

