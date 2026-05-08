import { Trash2 } from 'lucide-react'

interface VehicleBillingRowProps {
  row: {
    id: number
    selected: boolean
    brand: string
    car: string
    vehicleType: string
    price: string
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
  return (
   <div
  className={`grid gap-3 items-center border p-3 rounded-lg ${
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
          className="w-4 h-4"
        />
      </div>

      {/* BRAND */}
      <div>
        <select
          value={row.brand}
          onChange={e => {
            handleChange(row.id, 'brand', e.target.value)
            handleChange(row.id, 'car', '')
            handleChange(row.id, 'vehicleType', '')
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Select Brand</option>
          {brands.map((brand, index) => (
            <option key={index} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      {/* CAR */}
      <div>
        <select
          value={row.car}
          onChange={e => {
            const selectedCar = e.target.value
            handleChange(row.id, 'car', selectedCar)

            // automatic vehicle type and seating capacity set
            const matchedVehicle = vehicleList.find(
              vehicle =>
                vehicle.vehicle_brand === row.brand &&
                vehicle.vehicle_name === selectedCar
            )

            handleChange(
              row.id,
              'vehicleType',
              matchedVehicle?.vehicle_type || ''
            )

            handleChange(
              row.id,
              'seatingCapacity',
              matchedVehicle?.seating_capacity?.toString() || ''
            )
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Select Vehicle</option>
          {vehicleList
            .filter(
              vehicle =>
                vehicle.vehicle_brand === row.brand
            )
            .map(vehicle => (
              <option
                key={vehicle.id}
                value={vehicle.vehicle_name}
              >
                {vehicle.vehicle_name} - {vehicle.fuel_type}
              </option>
            ))}
        </select>
      </div>

      {/* VEHICLE TYPE */}
      <div>
        <select
          value={row.vehicleType}
          onChange={e => {
            handleChange(
              row.id,
              'vehicleType',
              e.target.value
            )
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Vehicle Type</option>
          {[
            ...new Set(
              vehicleList.map(vehicle => vehicle.vehicle_type)
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
          placeholder="Price"
          value={row.price}
          disabled={editingId !== row.id && editingId !== null}
          onChange={e =>
            handleChange(
              row.id,
              'price',
              e.target.value
            )
          }
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

    {/* SEATING CAPACITY */}
{showSeatingCapacity && (
  <div>
    <input
      type="number"
      placeholder="Seating Capacity"
      value={row.seatingCapacity || ''}
      disabled
      className="w-full border rounded-lg px-3 py-2 bg-gray-50"
    />
  </div>
)}

      {/* ACTIONS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleDelete(row.id)}
          className="p-2 rounded bg-red-100 hover:bg-red-200"
        >
          <Trash2 className="h-4 w-4 text-red-700" />
        </button>
      </div>
    </div>
  )
}

export default VehicleBillingRow
