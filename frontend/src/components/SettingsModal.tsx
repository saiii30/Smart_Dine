import { X, Moon, Sun, Palette } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

type MenuColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { theme, menuColor, toggleTheme, setMenuColor } = useTheme()

  const getColorClass = (color: MenuColor) => {
    const colorMap: Record<MenuColor, string> = {
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      purple: 'bg-purple-600',
      orange: 'bg-orange-600',
      red: 'bg-red-600',
      indigo: 'bg-indigo-600',
    }
    return colorMap[color] || 'bg-blue-600'
  }

  const getHeaderColorClasses = (color: MenuColor) => {
    const colorMap: Record<MenuColor, { bg: string; text: string }> = {
      blue: {
        bg: 'bg-blue-600 dark:bg-blue-700',
        text: 'text-white',
      },
      green: {
        bg: 'bg-green-600 dark:bg-green-700',
        text: 'text-white',
      },
      purple: {
        bg: 'bg-purple-600 dark:bg-purple-700',
        text: 'text-white',
      },
      orange: {
        bg: 'bg-orange-600 dark:bg-orange-700',
        text: 'text-white',
      },
      red: {
        bg: 'bg-red-600 dark:bg-red-700',
        text: 'text-white',
      },
      indigo: {
        bg: 'bg-indigo-600 dark:bg-indigo-700',
        text: 'text-white',
      },
    }
    return colorMap[color] || colorMap.blue
  }

  const headerColors = getHeaderColorClasses(menuColor)

  const colorOptions: { value: MenuColor; label: string; bgColor: string }[] = [
    { value: 'blue', label: 'Blue', bgColor: 'bg-blue-500' },
    { value: 'green', label: 'Green', bgColor: 'bg-green-500' },
    { value: 'purple', label: 'Purple', bgColor: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', bgColor: 'bg-orange-500' },
    { value: 'red', label: 'Red', bgColor: 'bg-red-500' },
    { value: 'indigo', label: 'Indigo', bgColor: 'bg-indigo-500' },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className={`flex items-center justify-between p-6 ${headerColors.bg} rounded-t-lg`}>
            <h2 className={`text-xl font-semibold ${headerColors.text}`}>Theme</h2>
            <button
              onClick={onClose}
              className={`${headerColors.text} hover:opacity-70 transition-opacity`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Theme Toggle */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  )}
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Theme
                  </label>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    theme === 'dark' ? getColorClass(menuColor) : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </p>
            </div>

            {/* Menu Color Selection */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Palette className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Menu Color
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setMenuColor(color.value)}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      menuColor === color.value
                        ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-primary-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-full h-8 ${color.bgColor} rounded mb-2`} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {color.label}
                    </span>
                    {menuColor === color.value && (
                      <div className="absolute top-2 right-2">
                        <div className="w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsModal

