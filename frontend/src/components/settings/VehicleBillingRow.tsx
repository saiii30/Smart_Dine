import { Trash2 } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import BillingInput from './BillingInput'
import BillingSelect from './BillingSelect'
interface VehicleBillingRowProps {
  row: {
    id: number
    selected: boolean
    brand: string
    car: string
    vehicleType: string
    vehicle_id : number
    price: string
    fuelType: string 
    seatingCapacity?: string
  }
  brands: string[]
  vehicleList: any[]
  editingId: number | null
  handleChange: (id: number, field: any, value: string | boolean) => void
  handleDelete: (id: number) => void
  showSeatingCapacity?: boolean
}

const VehicleBillingRow = ({
  row,
  brands,
  vehicleList,
  editingId,
  handleChange,
  handleDelete,
  showSeatingCapacity = false
}: VehicleBillingRowProps) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
   <div
  className={`grid gap-3 items-center border p-3 rounded-lg ${
    isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
  } ${
    showSeatingCapacity ? 'grid-cols-7' : 'grid-cols-6'
  }`}
>
      {/* CHECKBOX */}
      <div>
        <input
          type="checkbox"
          checked={row.selected}
          onChange={e => {
            const checked = e.target.checked
            handleChange(row.id, 'selected', checked)
          }}
          className={`w-4 h-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
      </div>

      {/* BRAND */}
      <div>
        <BillingSelect
  value={row.brand}
  placeholder="Select Brand"
  onChange={e => {
    handleChange(row.id, 'brand', e.target.value)
    handleChange(row.id, 'car', '')
    handleChange(row.id, 'vehicleType', '')
  }}
  options={brands.map(brand => ({
    label: brand,
    value: brand
  }))}
/>
      </div>

      {/* CAR */}
      <div>
        <BillingSelect
  value={row.car}
  placeholder="Select Vehicle"
  onChange={e => {
    const selectedCar = e.target.value

    handleChange(row.id, 'car', selectedCar)

    const matchedVehicle =
      vehicleList.find(
        vehicle =>
          vehicle.vehicle_brand ===
            row.brand &&
          vehicle.vehicle_name ===
            selectedCar
      )

    handleChange(
      row.id,
      'vehicle_id',
      matchedVehicle?.id || 0
    )

    handleChange(
      row.id,
      'vehicleType',
      matchedVehicle?.vehicle_type || ''
    )

    handleChange(
      row.id,
      'fuelType',
      matchedVehicle?.fuel_type || ''
    )

    handleChange(
      row.id,
      'seatingCapacity',
      matchedVehicle?.seating_capacity?.toString() ||
        ''
    )
  }}
  options={vehicleList
    .filter(
      vehicle =>
        vehicle.vehicle_brand === row.brand
    )
    .map(vehicle => ({
      label: `${vehicle.vehicle_name} - ${vehicle.fuel_type}`,
      value: vehicle.vehicle_name
    }))}
/>
      </div>

      {/* VEHICLE TYPE */}
      <div>
       <BillingSelect
  value={row.vehicleType}
  placeholder="Vehicle Type"
  onChange={e =>
    handleChange(
      row.id,
      'vehicleType',
      e.target.value
    )
  }
  options={[
    ...new Set(
      vehicleList.map(
        vehicle => vehicle.vehicle_type
      )
    )
  ].map(vehicleType => ({
    label: vehicleType,
    value: vehicleType
  }))}
/>
      </div>

      {/* PRICE */}
      

    {/* SEATING CAPACITY */}
{showSeatingCapacity && (
  <div>
    <BillingInput
  type="number"
  placeholder="Seating Capacity"
  value={row.seatingCapacity || ''}
  disabled
/>
  </div>
)}

<div>
        <BillingInput
  type="number"
  placeholder="Price"
  value={row.price}
  disabled={
    editingId !== row.id &&
    editingId !== null
  }
  onChange={e =>
    handleChange(
      row.id,
      'price',
      e.target.value
    )
  }
/>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleDelete(row.id)}
          className={`p-2 rounded ${
            isDark 
              ? 'bg-red-900 hover:bg-red-800 text-red-300' 
              : 'bg-red-100 hover:bg-red-200 text-red-700'
          }`}
        >
          <Trash2 className={`h-4 w-4 ${isDark ? 'text-red-300' : 'text-red-700'}`} />
        </button>
      </div>
    </div>
  )
}

export default VehicleBillingRow
