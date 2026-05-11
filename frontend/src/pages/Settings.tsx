import { Settings as SettingsIcon } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useEffect, useState } from 'react'
import axios from 'axios'
import ExpirySettings from '../components/settings/ExpirySettings'
import GeneralVehicleSettings from '../components/settings/GeneralVehicleSettings'

interface VehicleBillingRow {
  id: number
   backendId?: string
  selected: boolean
  brand: string
  car: string
  vehicleType: string
  fuelType: string
  checked: boolean
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
    checked: false,
    selected: false,
    brand: '',
    car: '',
    vehicleType: '',
    fuelType: '',
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

useEffect(() => {
  fetchBillingSettings()
}, [])


const fetchBillingSettings = async () => {
  try {
    const agencyId =
      localStorage.getItem('selectedAgencyId')

    const token = localStorage.getItem('token')

    const response = await axios.get(
      `http://127.0.0.1:8000/api/billing-settings/agency/${agencyId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = response.data

    // COMMON VEHICLES
    const commonVehicles = data.filter(
      (item: any) => !item.company_id
    )

    setVehicleRows(
      commonVehicles.map((item: any) => ({
        id: Date.now() + Math.random(),
        backendId: item.id,
        selected: false,
        checked: false,
        brand: item.vehicle_brand,
        car: item.vehicle_name,
        vehicleType: item.vehicle_type,
        fuelType: item.fuel_type,
        price: String(item.price),
        seatingCapacity: String(
          item.seating_capacity
        )
      }))
    )

    // COMPANY VEHICLES
    const companyVehicles = data.filter(
      (item: any) => item.company_id
    )

    const groupedCompanies: any[] = []

    companyVehicles.forEach((item: any) => {
      const existingCompany =
        groupedCompanies.find(
          company =>
            company.companyName ===
            item.company_id
        )

      const vehicle = {
        id: Date.now() + Math.random(),
        backendId: item.id,
        selected: false,
        checked: false,
        brand: item.vehicle_brand,
        car: item.vehicle_name,
        vehicleType: item.vehicle_type,
        fuelType: item.fuel_type,
        price: String(item.price),
        seatingCapacity: String(
          item.seating_capacity
        )
      }

      if (existingCompany) {
        existingCompany.vehicles.push(vehicle)
      } else {
        groupedCompanies.push({
          id: Date.now() + Math.random(),
          companyName: item.company_id,
          vehicles: [vehicle]
        })
      }
    })

    setCompanies(groupedCompanies)
  } catch (error) {
    console.error(error)
  }
}


 
   const handleAddRow = () => {
    setVehicleRows([
      ...vehicleRows,
      {
        id: Date.now(),
        selected: false,
        brand: '',
        car: '',
        vehicleType: '',
        fuelType: '',
        price: '',
        seatingCapacity: '',
        checked: false
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
                 backendId: undefined,
                selected: false,
                brand: '',
                car: '',
                vehicleType: '',
                fuelType: '',
                price: '',
                seatingCapacity: '',
                checked: false
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
            backendId: undefined,
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
  const handleDelete = async (
  id: number
) => {
  try {
    const row = vehicleRows.find(
      item => item.id === id
    )

    if (row?.backendId) {
      const agencyId =
        localStorage.getItem(
          'selectedAgencyId'
        )

      const formData = new FormData()

      formData.append(
        'agency_id',
        agencyId || ''
      )

      await axios.delete(
        `http://127.0.0.1:8000/api/billing-settings/${row.backendId}`,
        {
          data: formData
        }
      )
    }

    setVehicleRows(prev =>
      prev.filter(row => row.id !== id)
    )
  } catch (error) {
    console.error(error)
    alert('Delete Failed')
  }
}

  
const handleDeleteCompanyVehicle = async (
  companyId: number,
  vehicleId: number
) => {
  try {
    const company = companies.find(
      c => c.id === companyId
    )

    const vehicle = company?.vehicles.find(
      v => v.id === vehicleId
    )

    if (vehicle?.backendId) {
      const agencyId =
        localStorage.getItem(
          'selectedAgencyId'
        )

      const formData = new FormData()

      formData.append(
        'agency_id',
        agencyId || ''
      )

      await axios.delete(
        `http://127.0.0.1:8000/api/billing-settings/${vehicle.backendId}`,
        {
          data: formData
        }
      )
    }

    setCompanies(prev =>
      prev.map(company => {
        if (company.id === companyId) {
          return {
            ...company,
            vehicles: company.vehicles.filter(
              vehicle =>
                vehicle.id !== vehicleId
            )
          }
        }

        return company
      })
    )
  } catch (error) {
    console.error(error)
    alert('Delete Failed')
  }
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

  const handleSaveBillingSettings = async () => {
  try {
    const agencyId =
      localStorage.getItem('selectedAgencyId')

    const token = localStorage.getItem('token')

    for (const row of vehicleRows) {
      const formData = new FormData()

      formData.append(
        'agency_id',
        agencyId || ''
      )

      formData.append(
        'vehicle_brand',
        row.brand
      )

      formData.append(
        'vehicle_name',
        row.car
      )

      formData.append(
        'vehicle_type',
        row.vehicleType
      )

      formData.append(
        'fuel_type',
        row.fuelType
      )

      formData.append(
        'seating_capacity',
        row.seatingCapacity || '0'
      )

      formData.append(
        'price',
        row.price
      )

      // UPDATE
      if (row.backendId) {
        await axios.put(
          `http://127.0.0.1:8000/api/billing-settings/${row.backendId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
      }

      // CREATE
      else {
        const response = await axios.post(
          'http://127.0.0.1:8000/api/billing-settings',
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        row.backendId =
          response.data.id
      }
    }

    // COMPANY VEHICLES SAVE
for (const company of companies) {
  for (const row of company.vehicles) {
    const formData = new FormData()

    formData.append(
      'agency_id',
      agencyId || ''
    )

    formData.append(
      'company_id',
      company.companyName
    )

    formData.append(
      'vehicle_brand',
      row.brand
    )

    formData.append(
      'vehicle_name',
      row.car
    )

    formData.append(
      'vehicle_type',
      row.vehicleType
    )

    formData.append(
      'fuel_type',
      row.fuelType || 'Petrol'
    )

    formData.append(
      'seating_capacity',
      row.seatingCapacity || '0'
    )

    formData.append(
      'price',
      row.price
    )

    // UPDATE
    if (row.backendId) {
      await axios.put(
        `http://127.0.0.1:8000/api/billing-settings/${row.backendId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
    }

    // CREATE
    else {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/billing-settings',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      row.backendId =
        response.data.id
    }
  }
}

    alert('Saved Successfully')

    fetchBillingSettings()
  } catch (error) {
    console.error(error)
    alert('Save Failed')
  }
}

 const handleDeleteCompany = async (
  companyId: number
) => {
  try {
    const company = companies.find(
      c => c.id === companyId
    )

    if (!company) return

    const agencyId =
      localStorage.getItem(
        'selectedAgencyId'
      )

    // DELETE ALL VEHICLES INSIDE COMPANY
    for (const vehicle of company.vehicles) {
      if (vehicle.backendId) {
        const formData = new FormData()

        formData.append(
          'agency_id',
          agencyId || ''
        )

        await axios.delete(
          `http://127.0.0.1:8000/api/billing-settings/${vehicle.backendId}`,
          {
            data: formData
          }
        )
      }
    }

    // REMOVE COMPANY FROM STATE
    setCompanies(prev =>
      prev.filter(
        company =>
          company.id !== companyId
      )
    )

    alert('Company Deleted Successfully')
  } catch (error) {
    console.error(error)
    alert('Delete Failed')
  }
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
                onClick={handleSaveBillingSettings}
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
         handleSaveBillingSettings={handleSaveBillingSettings}
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
