import { useNavigate } from 'react-router-dom'
import { MapPin, Car, User, Wrench, DollarSign, FileText, Calendar, Bell } from 'lucide-react'

const QuickActionsSection = () => {
  const navigate = useNavigate()

  const quickActions = [
    {
      icon: MapPin,
      label: 'New Trip',
      description: 'Create new trip',
      color: 'blue',
      path: '/trips'
    },
    {
      icon: Car,
      label: 'Add Vehicle',
      description: 'Add new vehicle',
      color: 'green',
      path: '/vehicles'
    },
    {
      icon: User,
      label: 'Add Driver',
      description: 'Add new driver',
      color: 'purple',
      path: '/drivers'
    },
    {
      icon: Wrench,
      label: 'Maintenance',
      description: 'View vehicle maintenance',
      color: 'orange',
      path: '/vehicles'
    },
    {
      icon: DollarSign,
      label: 'Log Expense',
      description: 'Log new expense',
      color: 'yellow',
      path: '/expenses'
    },
    {
      icon: FileText,
      label: 'Generate Report',
      description: 'Generate reports',
      color: 'indigo',
      path: '/reports'
    },
    {
      icon: Calendar,
      label: 'Schedule',
      description: 'View schedule',
      color: 'pink',
      path: '/schedule'
    },
    {
      icon: Bell,
      label: 'Alerts',
      description: 'View alerts and notifications',
      color: 'red',
      path: '/notifications'
    }
  ]

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; hover: string; icon: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', hover: 'hover:bg-green-100 dark:hover:bg-green-900/30', icon: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30', icon: 'text-orange-600 dark:text-orange-400' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30', icon: 'text-yellow-600 dark:text-yellow-400' },
      indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30', icon: 'text-indigo-600 dark:text-indigo-400' },
      pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30', icon: 'text-pink-600 dark:text-pink-400' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', hover: 'hover:bg-red-100 dark:hover:bg-red-900/30', icon: 'text-red-600 dark:text-red-400' }
    }
    return colorMap[color] || colorMap.blue
  }

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          const colors = getColorClasses(action.color)
          
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              aria-label={action.description}
              className={`flex flex-col items-center justify-center p-4 ${colors.bg} rounded-lg ${colors.hover} transition-colors`}
            >
              <Icon className={`h-8 w-8 ${colors.icon} mb-2`} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default QuickActionsSection
