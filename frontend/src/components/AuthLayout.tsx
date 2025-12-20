import { ReactNode } from 'react'
import { User, Car, MapPin, Navigation } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  description?: string
}

const AuthLayout = ({ children, title, subtitle, description }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      {/* Left Column - Marketing Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
        <div className="flex flex-col justify-center px-12 py-16 relative z-10">
          <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-8 leading-tight">
            Set Your Travel Management on Auto-Pilot
          </h1>
          
          {/* Hexagonal Portrait Grid */}
          <div className="relative mt-12 w-full">
            {/* Background hexagons (outline) */}
            <div className="absolute inset-0 opacity-20">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square border-2 border-gray-400 dark:border-gray-600 transform rotate-45 rounded-lg"
                    style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                  />
                ))}
              </div>
            </div>

            {/* Main portrait - center (User Icon) */}
            <div className="relative z-10 flex items-center justify-center">
              <div className="w-48 h-48 bg-gradient-to-br from-orange-200 to-orange-300 dark:from-orange-700 dark:to-orange-800 rounded-2xl transform rotate-12 shadow-xl flex items-center justify-center">
                <div className="w-40 h-40 bg-gradient-to-br from-orange-300 to-orange-400 dark:from-orange-600 dark:to-orange-700 rounded-xl flex items-center justify-center">
                  <User className="w-24 h-24 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Smaller portraits around */}
            {/* Top Left - Car Icon */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-300 dark:bg-yellow-700 rounded-xl transform -rotate-12 shadow-lg flex items-center justify-center z-20">
              <Car className="w-16 h-16 text-white" strokeWidth={2} />
            </div>

            {/* Bottom Left - Map Icon */}
            <div className="absolute bottom-0 left-20 w-32 h-32 bg-purple-300 dark:bg-purple-700 rounded-xl transform rotate-12 shadow-lg flex items-center justify-center z-20">
              <MapPin className="w-16 h-16 text-white" strokeWidth={2} />
            </div>

            {/* Top Right - Tracking/Navigation Icon */}
            <div className="absolute top-8 right-0 w-32 h-32 bg-red-300 dark:bg-red-700 rounded-xl transform -rotate-12 shadow-lg flex items-center justify-center z-20">
              <Navigation className="w-16 h-16 text-white" strokeWidth={2} />
            </div>

            {/* Bottom Right - User Icon (secondary) */}
            <div className="absolute bottom-0 right-20 w-32 h-32 bg-blue-300 dark:bg-blue-700 rounded-xl transform rotate-12 shadow-lg flex items-center justify-center z-20">
              <User className="w-16 h-16 text-white" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form Section */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold text-gray-800 dark:text-white">TMS</span>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{subtitle}</p>
          
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
              {description}
            </p>
          )}

          {/* Form Content */}
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout

