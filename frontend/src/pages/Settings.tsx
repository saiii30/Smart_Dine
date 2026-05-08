import { Settings as SettingsIcon } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useEffect, useState } from 'react'
import axios from 'axios'
import ExpirySettings from '../components/settings/ExpirySettings'
import GeneralVehicleSettings from '../components/settings/GeneralVehicleSettings'

interface VehicleBillingRow {
  id: number
  selected: boolean
  brand: string
  car: string
  vehicleType: string
  price: string
  seatingCapacity?: string
}

interface CompanyBilling {
  id: number
  companyName: string
  vehicles: VehicleBillingRow[]
}

const Settings = () => {
  const { expirySettings, updateExpirySettings, saveSettings, isLoading } = useSettings()
  const [activeTab, setActiveTab] = useState('settings')
  const [vehicleList, setVehicleList] = useState<any[]>([])
  
  const documentTypes = [
    { id: 'driving_license', name: 'License', category: 'driver' },
    { id: 'insurance', name: 'Insurance', category: 'vehicle' },
    { id: 'puc_certificate', name: 'PUC Certificate', category: 'vehicle' },
    { id: 'registration_certificate', name: 'Registration', category: 'vehicle' },
    { id: 'service_due', name: 'Service Due', category: 'vehicle' },
  ]

 

   const [vehicleRows, setVehicleRows] = useState<
  VehicleBillingRow[]
>([
  {
    id: 1,
    selected: false,
    brand: '',
    car: '',
    vehicleType: '',
    price: '',
    seatingCapacity: ''
  }
])

  
  const dayOptions = [1, 5, 10, 20, 30]
  const [editingId, setEditingId] = useState<number | null>(null)

   
   const [companies, setCompanies] = useState<CompanyBilling[]>([])

const [copiedVehicles, setCopiedVehicles] = useState<
  VehicleBillingRow[]
>([])

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

  const [companiesList, setCompaniesList] = useState<{ id: string; company_name: string; company_branch: string; agency_id: string }[]>([])

  useEffect(() => {
  const agencyId = localStorage.getItem('selectedAgencyId')
  if (!agencyId) return

  const fetchCompanies = async () => {
    try {

      const token = localStorage.getItem('token')
    const headers = {
      Authorization: `Bearer ${token}`,
    }

      const res = await axios.get(`http://127.0.0.1:8000/api/companies/trip/dropdown/?agency_id=${agencyId}`,
        {headers}
      )
      setCompaniesList(res.data) // [{id, company_name}]
    } catch (err) {
      
      console.error('Failed to fetch companies', err)
      
    }
  }

  fetchCompanies()
}, [])


 
   const handleAddRow = () => {
    setVehicleRows([
      ...vehicleRows,
      {
        id: Date.now(),
        selected: false,
        brand: '',
        car: '',
        vehicleType: '',
        price: '',
        seatingCapacity: ''
      }
    ])
  }


  useEffect(() => {
  fetchVehicleList()
}, [])

const fetchVehicleList = async () => {
  try {
    const response = await fetch(
      'http://127.0.0.1:8000/api/vehicle-list'
    )

    const data = await response.json()

    setVehicleList(data)
  } catch (error) {
    console.error(error)
  }
}

const brands = [
  ...new Set(
    vehicleList.map(vehicle => vehicle.vehicle_brand)
  )
]
  const handleAddCompany = () => {
  setCompanies(prev => [
    ...prev,
    {
      id: Date.now(),
      companyName: '',
      vehicles: []
    }
  ])
}



const handleAddVehicleToCompany = (
  companyId: number
) => {
  setCompanies(prev =>
    prev.map(company =>
      company.id === companyId
        ? {
            ...company,
            vehicles: [
              ...company.vehicles,
              {
                id: Date.now(),
                selected: false,
                brand: '',
                car: '',
                vehicleType: '',
                price: '',
                seatingCapacity: ''
              }
            ]
          }
        : company
    )
  )
}

const handlePasteVehicles = (
  companyId: number
) => {
  setCompanies(prev =>
    prev.map(company => {
      if (company.id !== companyId) {
        return company
      }

      // already existing vehicles
      const existingVehicles = company.vehicles

      // remove duplicates
      const uniqueVehicles = copiedVehicles.filter(
        copiedVehicle =>
          !existingVehicles.some(
            existingVehicle =>
              existingVehicle.brand === copiedVehicle.brand &&
              existingVehicle.car === copiedVehicle.car &&
              existingVehicle.vehicleType === copiedVehicle.vehicleType 
          )
      )

      return {
        ...company,
        vehicles: [
          ...existingVehicles,
          ...uniqueVehicles.map(vehicle => ({
            ...vehicle,
            id: Date.now() + Math.random(),
            selected: false
          }))
        ]
      }
    })
  )
}

const handleCompanyVehicleChange = (
  companyId: number,
  vehicleId: number,
  field: keyof VehicleBillingRow,
  value: string
) => {
  setCompanies(prev =>
    prev.map(company =>
      company.id === companyId
        ? {
            ...company,
            vehicles: company.vehicles.map(vehicle =>
              vehicle.id === vehicleId
                ? {
                    ...vehicle,
                    [field]: value
                  }
                : vehicle
            )
          }
        : company
    )
  )
}

   // UPDATE ROW
  const handleChange = (
    id: number,
    field: keyof VehicleBillingRow,
    value: string | boolean
  ) => {
    setVehicleRows(prev =>
      prev.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  // DELETE ROW
  const handleDelete = (id: number) => {
    setVehicleRows(prev => prev.filter(row => row.id !== id))
  }

  
const handleDeleteCompanyVehicle = (
  companyId: number,
  vehicleId: number
) => {
  setCompanies(prev =>
    prev.map(company => {
      if (company.id === companyId) {
        return {
          ...company,
          vehicles: company.vehicles.filter(
            vehicle => vehicle.id !== vehicleId
          )
        }
      }

      return company
    })
  )
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

  const handleDeleteCompany = (
  companyId: number
) => {
  setCompanies(prev =>
    prev.filter(
      company => company.id !== companyId
    )
  )
}

const handleCompanyChange = (
  companyId: number,
  companyName: string
) => {
  setCompanies(prev =>
    prev.map(company =>
      company.id === companyId
        ? {
            ...company,
            companyName: companyName
          }
        : company
    )
  )
}

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      {/* TABS */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200'
          }`}
        >
          Settings
        </button>

        <button
          onClick={() => setActiveTab('common')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'common'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200'
          }`}
        >
          General Vehicle Settings
        </button>

        
      </div>


      {
        activeTab === 'settings' && (
          <div className="space-y-4">
            <ExpirySettings
              expirySettings={expirySettings}
              dayOptions={dayOptions}
              documentTypes={documentTypes}
              updateExpirySettings={updateExpirySettings}
              handleDocumentDayChange={handleDocumentDayChange}
              handleClearSelection={handleClearSelection}
              handleDocumentTypeToggle={handleDocumentTypeToggle}
            />

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
        )
      }

       {/* COMMON SETTINGS TAB */}
      {activeTab === 'common' && (
        <GeneralVehicleSettings
          vehicleRows={vehicleRows}
          brands={brands}
          vehicleList={vehicleList}
          editingId={editingId}
          handleChange={handleChange}
          handleDelete={handleDelete}
          handleAddRow={handleAddRow}
          setCopiedVehicles={setCopiedVehicles}
          companies={companies}
          companiesList={companiesList}
          handleAddCompany={handleAddCompany}
          handleAddVehicleToCompany={handleAddVehicleToCompany}
          handleDeleteCompany={handleDeleteCompany}
          handlePasteVehicles={handlePasteVehicles}
          handleCompanyVehicleChange={handleCompanyVehicleChange}
          handleDeleteCompanyVehicle={handleDeleteCompanyVehicle}
          handleCompanyChange={handleCompanyChange}
        />
      )}


  



    </div>
  )
}

export default Settings
