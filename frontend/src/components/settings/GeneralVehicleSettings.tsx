import { Car, Plus, Copy, Building2, Trash2, Clipboard } from 'lucide-react'
import VehicleBillingRow from './VehicleBillingRow'
import { useState } from 'react'

interface VehicleBillingRowType {
  id: number
  selected: boolean
  brand: string
  car: string
  vehicleType: string
  price: string
  seatingCapacity?: string
  checked: boolean
  fuelType: string
}

interface GeneralVehicleSettingsProps {
  handleSaveBillingSettings: () => void
  vehicleRows: VehicleBillingRowType[]
  brands: string[]
  vehicleList: any[]
  editingId: number | null
  handleChange: (id: number, field: any, value: string | boolean) => void
  handleDelete: (id: number) => void
  handleAddRow: () => void
  setCopiedVehicles: (vehicles: VehicleBillingRowType[]) => void
  companies: any[]
  companiesList: any[]
  handleAddCompany: () => void
  handleAddVehicleToCompany: (companyId: number) => void
  handleDeleteCompany: (companyId: number) => void
  handlePasteVehicles: (companyId: number) => void
  handleCompanyVehicleChange: (companyId: number, vehicleId: number, field: any, value: string) => void
  handleDeleteCompanyVehicle: (companyId: number, vehicleId: number) => void
  handleCompanyChange: (companyId: number, companyName: string) => void
}

const GeneralVehicleSettings = ({
  vehicleRows,
  brands,
  vehicleList,
  editingId,
  handleChange,
  handleDelete,
  handleAddRow,
  handleSaveBillingSettings,
  setCopiedVehicles,
  companies,
  companiesList,
  handleAddCompany,
  handleAddVehicleToCompany,
  handleDeleteCompany,
  handlePasteVehicles,
  handleCompanyVehicleChange,
  handleDeleteCompanyVehicle,
  handleCompanyChange
}: GeneralVehicleSettingsProps) => {

  const [showSeatingCapacity, setShowSeatingCapacity] = useState(false)
  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <div className="flex items-center justify-between mb-5">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">
            General Vehicle Settings
          </h2>
        </div>

        {/* RIGHT SIDE BUTTONS */}
        <div className="flex items-center gap-3">

          <label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={showSeatingCapacity}
    onChange={(e) => setShowSeatingCapacity(e.target.checked)}
  />
  Seating Capacity
</label>

          <button
            onClick={handleAddCompany}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Building2 className="h-4 w-4" />
          </button>

          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
  onClick={handleSaveBillingSettings}
  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
>
  Save
</button>

          <button
            onClick={() => {
              const selectedVehicles = vehicleRows.filter(row => row.selected)
              setCopiedVehicles(selectedVehicles)
            }}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* TABLE HEADER */}
<div
  className={`grid gap-2 mb-3 font-semibold text-sm bg-gray-100 p-3 rounded-lg ${
    showSeatingCapacity ? 'grid-cols-7' : 'grid-cols-6'
  }`}
>
      <div>Select</div>
  <div>Vehicle Brand</div>
  <div>Vehicle Name</div>
  <div>Vehicle Type</div>
  <div>Price</div>

  {showSeatingCapacity && (
  <div>Seating Capacity</div>
)}

  <div>Actions</div>
</div>

      {/* ROWS */}
      <div className="space-y-3">
        {vehicleRows.map(row => (
          <VehicleBillingRow
            key={row.id}
            row={row}
            brands={brands}
            vehicleList={vehicleList}
            editingId={editingId}
            handleChange={handleChange}
            handleDelete={handleDelete}
            showSeatingCapacity={showSeatingCapacity}
          />
        ))}

        {companies.length > 0 && (
          <div className="mt-18">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">
                Company Wise Billing
              </h2>
            </div>

            <div className="space-y-5">
              {companies.map(company => (
                <div
                  key={company.id}
                  className="border rounded-xl p-5 bg-gray-50"
                >
                  {/* TOP */}
                  <div className="flex items-center justify-between mb-4">
                    <select
                      value={company.companyName}
                      onChange={e => {
                        const selectedCompanyId = e.target.value

                        // already selected company check (other rows)
                        const alreadyExists = companies.some(
                          c => c.companyName === selectedCompanyId && c.id !== company.id
                        )

                        if (alreadyExists) {
                          alert("Already Added")
                          return
                        }

                        handleCompanyChange(company.id, selectedCompanyId)
                      }}
                      className="border rounded-lg px-3 py-2 w-64"
                    >
                      <option value="">
                        Select Company
                      </option>

                      {companiesList.map(companyName => (
                        <option
                          key={companyName.id}
                          value={companyName.id}
                        >
                          {companyName.company_name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      {/* ADD VEHICLE */}
                      <button
                        onClick={() => handleAddVehicleToCompany(company.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="p-2 rounded bg-red-100 hover:bg-red-200"
                      >
                        <Trash2 className="h-4 w-4 text-red-700" />
                      </button>

                      {/* PASTE */}
                      <button
                        onClick={() => handlePasteVehicles(company.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg"
                      >
                        <Clipboard className="h-4 w-4" />
                      </button>
                    </div>
                  </div>


                  {/* <div className="grid grid-cols-7 gap-2 mb-3 font-semibold text-sm bg-gray-100 p-3 rounded-lg"> */}

                  {/* TABLE HEADER */}
                <div
  className={`grid gap-7 mb-3 font-semibold text-sm bg-gray-100 p-3 rounded-lg ${
    showSeatingCapacity ? 'grid-cols-6' : 'grid-cols-5'
  }`}
>
                    <div>Vehicle Brand</div>
                    <div>Vehicle Name</div>
                    <div>Vehicle Type</div>
                    <div>Price</div>
                     {showSeatingCapacity && (
  <div>Seating Capacity</div>
)}
                    <div>Actions</div>
                  </div>

                  {/* VEHICLES */}
                  <div className="space-y-3">
                    {company.vehicles.map((vehicle: any) => (
                      <CompanyVehicleRow
                        key={vehicle.id}
                        vehicle={vehicle}
                        company={company}
                        brands={brands}
                        vehicleList={vehicleList}
                        handleCompanyVehicleChange={handleCompanyVehicleChange}
                        handleDeleteCompanyVehicle={handleDeleteCompanyVehicle}
                        showSeatingCapacity={showSeatingCapacity}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Separate component for company vehicle rows
const CompanyVehicleRow = ({
  vehicle,
  company,
  brands,
  vehicleList,
  handleCompanyVehicleChange,
  handleDeleteCompanyVehicle,
  showSeatingCapacity
}: {
  vehicle: any
  company: any
  brands: string[]
  vehicleList: any[]
  handleCompanyVehicleChange: (companyId: number, vehicleId: number, field: any, value: string) => void
  handleDeleteCompanyVehicle: (companyId: number, vehicleId: number) => void
showSeatingCapacity: boolean
}) => {
  return (
<div
  className={`grid gap-1 items-center border p-3 rounded-lg bg-white ${
    showSeatingCapacity ? 'grid-cols-6' : 'grid-cols-5'
  }`}
>
      {/* BRAND */}
      <div>
        <select
          value={vehicle.brand}
          onChange={e => {
            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'brand',
              e.target.value
            )

            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'car',
              ''
            )

            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'vehicleType',
              ''
            )
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">
            Select Brand
          </option>

          {brands.map((brand, index) => (
            <option
              key={index}
              value={brand}
            >
              {brand}
            </option>
          ))}
        </select>
      </div>

      {/* VEHICLE NAME */}
      <div>
        <select
          value={vehicle.car}
          onChange={e => {
            const selectedCar = e.target.value

            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'car',
              selectedCar
            )

            // AUTO VEHICLE TYPE AND SEATING CAPACITY
            const matchedVehicle = vehicleList.find(
              item =>
                item.vehicle_brand === vehicle.brand &&
                item.vehicle_name === selectedCar
            )

            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'vehicleType',
              matchedVehicle?.vehicle_type || ''
            )

            handleCompanyVehicleChange(
  company.id,
  vehicle.id,
  'fuelType',
  matchedVehicle?.fuel_type || ''
)

            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'seatingCapacity',
              matchedVehicle?.seating_capacity?.toString() || ''
            )
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">
            Select Vehicle
          </option>

          {vehicleList
            .filter(
              item =>
                item.vehicle_brand ===
                vehicle.brand
            )
            .map(item => (
              <option value={item.vehicle_name} key={item.id}>
                {item.vehicle_name} - {item.fuel_type}
              </option>
            ))}
        </select>
      </div>

      {/* VEHICLE TYPE */}
      <div>
        <select
          value={vehicle.vehicleType}
          onChange={e => {
            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'vehicleType',
              e.target.value
            )
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">
            Vehicle Type
          </option>

          {[
            ...new Set(
              vehicleList.map(
                item => item.vehicle_type
              )
            )
          ].map((vehicleType, index) => (
            <option
              key={index}
              value={vehicleType}
            >
              {vehicleType}
            </option>
          ))}
        </select>
      </div>

      {/* PRICE */}
      <div>
        <input
          type="number"
          value={vehicle.price}
          placeholder="Price"
          onChange={e =>
            handleCompanyVehicleChange(
              company.id,
              vehicle.id,
              'price',
              e.target.value
            )
          }
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* SEATING CAPACITY */}
    {/* <div className={showSeatingCapacity ? '' : 'invisible'}>
  <input
    type="number"
    value={vehicle.seatingCapacity || ''}
    disabled
    className="w-full border rounded-lg px-3 py-2 bg-gray-50"
  />
</div> */}

{showSeatingCapacity && (
  <div>
    <input
      type="number"
      placeholder="Seating Capacity"
      value={vehicle.seatingCapacity || ''}
      disabled
      className="w-full border rounded-lg px-3 py-2 bg-gray-50"
    />
  </div>
)}


      {/* DELETE */}
      <div className="w-full px-3 py-2">
        <button
          onClick={() =>
            handleDeleteCompanyVehicle(
              company.id,
              vehicle.id
            )
          }
          className="p-2 rounded bg-red-100 hover:bg-red-200"
        >
          <Trash2 className="h-4 w-4 text-red-700" />
        </button>
      </div>
    </div>
  )
}

export default GeneralVehicleSettings
