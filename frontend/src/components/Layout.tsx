import { useState, useEffect, useMemo } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSettings } from '../contexts/SettingsContext.tsx'
import { LogOut, CarTaxiFront, Users, LayoutDashboard, Menu, X, User as UserIcon, ChevronDown, Palette, RouteIcon, Bell, Settings, MapPin } from 'lucide-react'
import SettingsModal from './SettingsModal'
import DriverUnauthorizedScreen from './DriverUnauthorizedScreen'
import { Wallet } from 'lucide-react'
import { Building2} from "lucide-react";
import axios from 'axios'
const Layout = () => {
  const { user, logout } = useAuth()
  const { menuColor } = useTheme()
  const { expirySettings } = useSettings()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  // Fetch notifications on component mount and set up periodic refresh
  useEffect(() => {
    fetchNotifications()
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [expirySettings]) // Add expirySettings as dependency

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications/')
      const allNotifications = response.data
      
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
      
      // Apply same filtering logic as Notifications page
      let filteredNotifications = allNotifications
      
      // 1. Filter by expiry days (only show notifications within the configured days)
      filteredNotifications = filteredNotifications.filter((notification: any) => {
        const notificationDocType = notification.document_type.toLowerCase()
        const frontendDocId = reverseDocumentTypeMapping[notificationDocType] || notificationDocType
        const specificDays = expirySettings.documentExpiryDays[frontendDocId]
        const daysToUse = specificDays || expirySettings.globalExpiryDays
        return notification.days_remaining <= daysToUse
      })
      
      // 2. Filter by entity type (vehicle/driver notifications enabled)
      if (!expirySettings.vehicleNotificationsEnabled) {
        filteredNotifications = filteredNotifications.filter((notification: any) => notification.type !== 'vehicle')
      }
      if (!expirySettings.driverNotificationsEnabled) {
        filteredNotifications = filteredNotifications.filter((notification: any) => notification.type !== 'driver')
      }
      
      // 3. Filter by selected document types with smart logic
      if (expirySettings.selectedDocumentTypes.length > 0) {
        // If specific documents are selected, show only those
        filteredNotifications = filteredNotifications.filter((notification: any) => {
          const notificationDocType = notification.document_type.toLowerCase()
          const frontendDocId = reverseDocumentTypeMapping[notificationDocType] || notificationDocType
          return expirySettings.selectedDocumentTypes.includes(frontendDocId)
        })
      } else {
        // If no specific documents selected, show all enabled entity types
        // This handles the "Vehicle enabled shows all vehicle documents" case
        if (expirySettings.vehicleNotificationsEnabled) {
          // Keep all vehicle notifications
        } else {
          // Remove vehicle notifications if vehicle is disabled
          filteredNotifications = filteredNotifications.filter((notification: any) => notification.type !== 'vehicle')
        }
        
        if (expirySettings.driverNotificationsEnabled) {
          // Keep all driver notifications
        } else {
          // Remove driver notifications if driver is disabled
          filteredNotifications = filteredNotifications.filter((notification: any) => notification.type !== 'driver')
        }
      }
      
      setNotificationCount(filteredNotifications.length)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Listen for notification updates from other components
  useEffect(() => {
    const handleNotificationUpdate = () => {
      fetchNotifications()
    }

    // Custom event listener for notification updates
    window.addEventListener('notificationUpdate', handleNotificationUpdate)
    
    return () => {
      window.removeEventListener('notificationUpdate', handleNotificationUpdate)
    }
  }, [expirySettings]) // Add expirySettings as dependency

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAdmin = user?.role === 'ADMIN'
  const isSupervisor = user?.role === 'SUPERVISOR'
  const isDriver = user?.role === 'DRIVER'
  const isItCompany = user?.role === 'IT_COMPANY'
  const isAgencyActive = user?.agency_status === "Active";

  // Show unauthorized screen for drivers
  if (isDriver) {
    return <DriverUnauthorizedScreen />
  }
 const navigation = (() => {

  if (isSuperAdmin && !isAgencyActive) {
    return [
      { name: "Prices", href: "/prices", icon: Wallet }
    ];
  }

  return [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },

    ...(isAdmin || isSupervisor || isSuperAdmin
      ? [
          { name: 'Vehicles', href: '/vehicles', icon: CarTaxiFront },
          { name: 'Drivers', href: '/drivers', icon: Users },
        ]
      : []),

    { name: 'Trips', href: '/trips', icon: RouteIcon },
    { name: 'Live Tracking', href: '/live-tracking', icon: MapPin },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: notificationCount },
    { name: 'Settings', href: '/settings', icon: Settings },

    ...(isAdmin || isSuperAdmin || isSupervisor
      ? [{ name: "It Companies", href: "/ITCompanyDashboard", icon: Building2 }]
      : []),

    ...(isSuperAdmin
      ? [
          { name: 'Users', href: '/users', icon: Users },
          { name: "Prices", href: "/prices", icon: Wallet }
        ]
      : []),
  ];

})(); // 🔥 THIS () IS IMPORTANT

  const isActive = (path: string) => location.pathname === path

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Administrator',
      travel_provider: 'Travel Provider',
      it_company: 'IT Company',
    }
    return roleMap[role] || role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getMenuColorClasses = () => {
    const colorMap: Record<string, { bg: string; text: string; hover: string; activeBg: string; activeText: string }> = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-700 dark:text-blue-300',
        hover: 'hover:bg-blue-50 dark:hover:bg-blue-800',
        activeBg: 'bg-blue-50 dark:bg-blue-800',
        activeText: 'text-blue-700 dark:text-blue-300',
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-700 dark:text-green-300',
        hover: 'hover:bg-green-50 dark:hover:bg-green-800',
        activeBg: 'bg-green-50 dark:bg-green-800',
        activeText: 'text-green-700 dark:text-green-300',
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-700 dark:text-purple-300',
        hover: 'hover:bg-purple-50 dark:hover:bg-purple-800',
        activeBg: 'bg-purple-50 dark:bg-purple-800',
        activeText: 'text-purple-700 dark:text-purple-300',
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900',
        text: 'text-orange-700 dark:text-orange-300',
        hover: 'hover:bg-orange-50 dark:hover:bg-orange-800',
        activeBg: 'bg-orange-50 dark:bg-orange-800',
        activeText: 'text-orange-700 dark:text-orange-300',
      },
      red: {
        bg: 'bg-red-100 dark:bg-red-900',
        text: 'text-red-700 dark:text-red-300',
        hover: 'hover:bg-red-50 dark:hover:bg-red-800',
        activeBg: 'bg-red-50 dark:bg-red-800',
        activeText: 'text-red-700 dark:text-red-300',
      },
      indigo: {
        bg: 'bg-indigo-100 dark:bg-indigo-900',
        text: 'text-indigo-700 dark:text-indigo-300',
        hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-800',
        activeBg: 'bg-indigo-50 dark:bg-indigo-800',
        activeText: 'text-indigo-700 dark:text-indigo-300',
      },
    }
    return colorMap[menuColor] || colorMap.blue
  }

  const menuColors = getMenuColorClasses()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-sm z-40 flex items-center justify-between px-4">
        {/* Left: Menu Toggle and Logo */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            {/* Mobile: Show X when open, Menu when closed */}
            {sidebarOpen ? (
              <X className="h-6 w-6 text-gray-600 dark:text-gray-300 md:hidden" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300 md:hidden" />
            )}
            {/* Desktop: Show X when expanded, Menu when collapsed */}
            <span className="hidden md:inline">
              {sidebarOpen ? (
                <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              )}
            </span>
          </button>
          <h1 className={`text-xl font-bold ${
            menuColor === 'blue' ? 'text-blue-600 dark:text-blue-400' :
            menuColor === 'green' ? 'text-green-600 dark:text-green-400' :
            menuColor === 'purple' ? 'text-purple-600 dark:text-purple-400' :
            menuColor === 'orange' ? 'text-orange-600 dark:text-orange-400' :
            menuColor === 'red' ? 'text-red-600 dark:text-red-400' :
            'text-indigo-600 dark:text-indigo-400'
          }`}>TMS</h1>
        </div>

        {/* Right: Settings and User Info */}
        <div className="flex items-center space-x-3">
          {/* Settings Button - Hide for IT Company users */}
          {!isItCompany && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Settings"
            >
              <Palette className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          {/* User Info */}
          <div className="relative">
            <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              menuColor === 'blue' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
              menuColor === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
              menuColor === 'purple' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
              menuColor === 'orange' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
              menuColor === 'red' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
              'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
            }`}>
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleDisplayName(user?.role || '')}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown Menu */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                      menuColor === 'blue' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                      menuColor === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                      menuColor === 'purple' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                      menuColor === 'orange' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                      menuColor === 'red' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                      'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      <UserIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      <p className={`text-xs mt-1 ${
                        menuColor === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                        menuColor === 'green' ? 'text-green-600 dark:text-green-400' :
                        menuColor === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                        menuColor === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                        menuColor === 'red' ? 'text-red-600 dark:text-red-400' :
                        'text-indigo-600 dark:text-indigo-400'
                      }`}>{getRoleDisplayName(user?.role || '')}</p>
                      {user?.company_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{user.company_name}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      logout()
                      setUserMenuOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </header>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          style={{ top: '64px' }}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-lg z-30 transition-all duration-300 ease-in-out ${
          sidebarOpen
            ? 'translate-x-0 md:w-64 md:translate-x-0 w-64'
            : '-translate-x-full md:translate-x-0 md:w-20'
        }`}
        style={{ top: '64px' }}
      >
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-2 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false)
                    }
                  }}
                  className={`flex items-center ${
                    sidebarOpen ? 'px-4 justify-start' : 'px-2 justify-center'
                  } py-3 text-sm font-medium rounded-lg transition-colors group relative ${
                    isActive(item.href)
                      ? `${menuColors.activeBg} ${menuColors.activeText}`
                      : `text-gray-700 dark:text-gray-300 ${menuColors.hover}`
                  }`}
                  title={sidebarOpen ? undefined : item.name}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? 'mr-3' : 'mr-0'}`} />
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  {sidebarOpen && (
                    <span className="whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`transition-all duration-300 pt-16 ${
          sidebarOpen 
            ? 'pl-0 md:pl-64' // No padding on mobile (overlay), full padding on desktop
            : 'pl-0 md:pl-20'  // No padding on mobile, icon-only padding on desktop
        }`}
      >
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default Layout

