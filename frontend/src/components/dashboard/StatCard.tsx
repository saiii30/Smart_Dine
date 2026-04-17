import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  name: string
  value: number
  icon: LucideIcon
  gradient: string
  iconGradient: string
  bgGradient: string
}

const StatCard = ({ name, value, icon: Icon, gradient, iconGradient, bgGradient }: StatCardProps) => {
  return (
    <div
      className={`bg-gradient-to-br ${bgGradient} rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-transparent hover:scale-105`}
    >
      <div className="flex items-center">
        <div className={`bg-gradient-to-br ${iconGradient} p-3 rounded-lg shadow-md`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</p>
          <p className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${gradient}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

export default StatCard
