import { LogOut, Lock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const DriverUnauthorizedScreen = () => {
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Main unauthorized card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800">
        {/* Icon and Title */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your account doesn't have permission to access this application.
          </p>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Driver Account Detected
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Driver accounts are not authorized to access the admin dashboard. Please contact your administrator for proper access credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="space-y-3 mb-6 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Current Status:</strong> Logged in as Driver
          </p>
          <p>
            <strong>Access Level:</strong> Restricted
          </p>
          <p>
            <strong>Available Action:</strong> Logout only
          </p>
        </div>

        {/* Logout Button - Only available option */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </button>
          
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            You must log out to exit this screen
          </p>
        </div>
      </div>
    </div>
  )
}

export default DriverUnauthorizedScreen
