import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ExpirySettings {
  globalExpiryDays: number
  documentExpiryDays: Record<string, number>
  selectedDocumentTypes: string[]
  vehicleNotificationsEnabled: boolean
  driverNotificationsEnabled: boolean
}

interface SettingsContextType {
  expirySettings: ExpirySettings
  updateExpirySettings: (settings: Partial<ExpirySettings>) => void
  saveSettings: () => Promise<void>
  isLoading: boolean
}

const defaultSettings: ExpirySettings = {
  globalExpiryDays: 30,
  documentExpiryDays: {},
  selectedDocumentTypes: [],
  vehicleNotificationsEnabled: true,
  driverNotificationsEnabled: true,
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [expirySettings, setExpirySettings] = useState<ExpirySettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('expirySettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setExpirySettings(parsed)
      } catch (error) {
        console.error('Failed to load settings from localStorage:', error)
      }
    }
  }, [])

  const updateExpirySettings = (newSettings: Partial<ExpirySettings>) => {
    setExpirySettings(prev => ({ ...prev, ...newSettings }))
  }

  const saveSettings = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage
      localStorage.setItem('expirySettings', JSON.stringify(expirySettings))
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value: SettingsContextType = {
    expirySettings,
    updateExpirySettings,
    saveSettings,
    isLoading,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
