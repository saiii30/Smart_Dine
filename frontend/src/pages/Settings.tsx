import { Settings as SettingsIcon, Calendar, FileText, User } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

const Settings = () => {
  const { expirySettings, updateExpirySettings, saveSettings, isLoading } = useSettings()
  
  const documentTypes = [
    { id: 'driving_license', name: 'License', category: 'driver' },
    { id: 'insurance', name: 'Insurance', category: 'vehicle' },
    { id: 'puc_certificate', name: 'PUC Certificate', category: 'vehicle' },
    { id: 'registration_certificate', name: 'Registration', category: 'vehicle' },
    { id: 'service_due', name: 'Service Due', category: 'vehicle' },
  ]

  const dayOptions = [1, 5, 10, 20, 30]

  const handleDocumentDayChange = (documentId: string, days: number) => {
    const updatedDocumentExpiryDays = {
      ...expirySettings.documentExpiryDays,
      [documentId]: days
    }
    updateExpirySettings({ documentExpiryDays: updatedDocumentExpiryDays })
    
    // Trigger notification count update
    window.dispatchEvent(new CustomEvent('notificationUpdate'))
  }

  const handleClearSelection = () => {
    updateExpirySettings({ selectedDocumentTypes: [] })
    
    // Trigger notification count update
    window.dispatchEvent(new CustomEvent('notificationUpdate'))
  }

  const handleDocumentTypeToggle = (documentId: string) => {
    const currentTypes = expirySettings.selectedDocumentTypes
    const newTypes = currentTypes.includes(documentId) 
      ? currentTypes.filter(id => id !== documentId)
      : [...currentTypes, documentId]
    
    updateExpirySettings({ selectedDocumentTypes: newTypes })
    
    // Trigger notification count update
    window.dispatchEvent(new CustomEvent('notificationUpdate'))
  }

  const handleSaveSettings = async () => {
    try {
      await saveSettings()
      console.log('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="space-y-4">
        {/* Expiry Alert Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center space-x-2 mb-5">
            <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expiry Alert Settings</h2>
          </div>

          {/* Alert Days Filter */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              Default Alert Before (Days)
            </label>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    updateExpirySettings({ globalExpiryDays: days })
                    // Trigger notification count update
                    window.dispatchEvent(new CustomEvent('notificationUpdate'))
                  }}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                    expirySettings.globalExpiryDays === days
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Default alert period for documents without specific settings
            </p>
          </div>

          {/* Entity Type Toggle */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Alert Types
              </label>
              {expirySettings.selectedDocumentTypes.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <div className="space-y-2">
              {/* Vehicle Documents Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Vehicle Documents
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Insurance, PUC, Registration certificates
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      updateExpirySettings({ vehicleNotificationsEnabled: !expirySettings.vehicleNotificationsEnabled })
                      // Trigger notification count update
                      window.dispatchEvent(new CustomEvent('notificationUpdate'))
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      expirySettings.vehicleNotificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        expirySettings.vehicleNotificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {/* Vehicle Document Types */}
                {expirySettings.vehicleNotificationsEnabled && (
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="space-y-3">
                      {documentTypes.filter(doc => doc.category === 'vehicle').map((docType) => (
                        <div key={docType.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {docType.name}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDocumentTypeToggle(docType.id)}
                              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                expirySettings.selectedDocumentTypes.includes(docType.id) ? 'bg-blue-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                                  expirySettings.selectedDocumentTypes.includes(docType.id) ? 'translate-x-3.5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Alert before:</span>
                            <div className="flex flex-wrap gap-1">
                              {dayOptions.map((days) => (
                                <button
                                  key={days}
                                  onClick={() => handleDocumentDayChange(docType.id, days)}
                                  className={`px-2 py-1 text-xs rounded border transition-all ${
                                    (expirySettings.documentExpiryDays || {})[docType.id] === days
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                >
                                  {days}d
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Driver Documents Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Driver Documents
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        License
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      updateExpirySettings({ driverNotificationsEnabled: !expirySettings.driverNotificationsEnabled })
                      // Trigger notification count update
                      window.dispatchEvent(new CustomEvent('notificationUpdate'))
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      expirySettings.driverNotificationsEnabled ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        expirySettings.driverNotificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {/* Driver Document Types */}
                {expirySettings.driverNotificationsEnabled && (
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="space-y-3">
                      {documentTypes.filter(doc => doc.category === 'driver').map((docType) => (
                        <div key={docType.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {docType.name}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDocumentTypeToggle(docType.id)}
                              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                expirySettings.selectedDocumentTypes.includes(docType.id) ? 'bg-green-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                                  expirySettings.selectedDocumentTypes.includes(docType.id) ? 'translate-x-3.5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Alert before:</span>
                            <div className="flex flex-wrap gap-1">
                              {dayOptions.map((days) => (
                                <button
                                  key={days}
                                  onClick={() => handleDocumentDayChange(docType.id, days)}
                                  className={`px-2 py-1 text-xs rounded border transition-all ${
                                    (expirySettings.documentExpiryDays || {})[docType.id] === days
                                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                >
                                  {days}d
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className={`px-5 py-2 rounded-md font-medium text-white transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
