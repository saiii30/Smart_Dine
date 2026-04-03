import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { Plus, Edit, Trash2, Car, Search } from 'lucide-react'
import { Vehicle, Trip } from '../types'
import VehicleModal from '../components/VehicleModal'
import { useAuth } from '../contexts/AuthContext'
const Vehicles = () => {
 

  const { user } = useAuth()
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
const isAdmin = user?.role === "ADMIN";
const isSupervisor = user?.role === "SUPERVISOR";
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchVehicles()
    fetchTrips()
  }, [])

  const fetchVehicles = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/vehicles/')
      setVehicles(response.data)
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrips = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/trips/')
      setTrips(response.data)
    } catch (error) {
      console.error('Failed to fetch trips:', error)
    }
  }

  const getVehicleTrips = (vehicleId: number): Trip[] => {
    return trips.filter(trip =>
      trip.schedules.some(schedule => schedule.vehicle_id === vehicleId)
    )
  }

  const canDeleteVehicle = (vehicleId: number): boolean => {
    const vehicleTrips = getVehicleTrips(vehicleId)
    return vehicleTrips.length === 0
  }

  
  const handleCreate = () => {
    setEditingVehicle(null)
    setIsModalOpen(true)
    // Clear any existing form data from localStorage to ensure clean form
    try {
      localStorage.removeItem('vehicle_modal_draft_v1')
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  const handleEdit = async (vehicle: Vehicle) => {
    try {
      // Fetch complete vehicle details to ensure all fields are available
      const response = await axios.get(`http://127.0.0.1:8000/api/vehicles/${vehicle.id}`)
      setEditingVehicle(response.data)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to fetch vehicle details:', error)
      // Fallback to using the basic vehicle data if detailed fetch fails
      setEditingVehicle(vehicle)
      setIsModalOpen(true)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      await axios.delete(`http://127.0.0.1:8000/api/vehicles/${id}`)
      fetchVehicles()
    } catch (error: any) {
      console.error('Failed to delete vehicle:', error)
      
      // Extract detailed error message from backend response
      let errorMessage = 'Failed to delete vehicle'
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingVehicle(null)
  }

  const handleModalSuccess = () => {
    fetchVehicles()
    handleModalClose()
  }

  const getVehicleTypeColor = (type: string) => {
    // Basic mapping, fallback to gray
    const colors: Record<string, string> = {
      Sedan: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      SUV: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      Van: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      Bus: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      Mini_Bus: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
      Hatchback: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    }
    // Try to match somewhat flexibly since backend returns capitalized strings but we might have casing differences
    const key = Object.keys(colors).find(k => k.toLowerCase() === type.replace(' ', '_').toLowerCase());
    return key ? colors[key] : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
  }

  // Filter vehicles based on search query (vehicle number and model)
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) {
      return vehicles
    }
    const query = searchQuery.toLowerCase().trim()
    return vehicles.filter((vehicle) => {
      const vehicleNumberMatch = vehicle.vehicle_registration_number.toLowerCase().includes(query)
      const modelMatch = vehicle.vehicle_model.toLowerCase().includes(query)
      const typeMatch = vehicle.vehicle_type.toLowerCase().includes(query)
      return vehicleNumberMatch || modelMatch || typeMatch
    })
  }, [vehicles, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehicles</h1>
        <div className="flex flex-1 md:max-w-lg items-center gap-4 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Number / Model / Type"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
         {
          !isSupervisor && (
             <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors whitespace-nowrap"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Vehicle
          </button>
          )
         }
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Car className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() ? 'No vehicles found' : 'No vehicles'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery.trim()
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding your first vehicle.'}
          </p>

          {/* {!searchQuery.trim() && !isSupervisor && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Driver
            </button>
          )} */}
          {!searchQuery.trim() && !isSupervisor && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{vehicle.vehicle_registration_number}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {vehicle.vehicle_brand} {vehicle.vehicle_model} ({vehicle.manufacturing_year})
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getVehicleTypeColor(
                    vehicle.vehicle_type
                  )} dark:bg-opacity-20`}
                >
                  {vehicle.vehicle_type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Registration:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{vehicle.vehicle_registration_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Capacity:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{vehicle.seating_capacity} seats</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span
                    className={`font-medium ${vehicle.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                  >
                    {vehicle.vehicle_status}
                  </span>
                </div>
                {/* {getVehicleTrips(vehicle.id).length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned to:</div>
                    <div className="space-y-1">
                      {getVehicleTrips(vehicle.id).map(trip => (
                        <div key={trip.id} className="text-xs font-medium text-primary-600 dark:text-primary-400">
                          {trip.name} ({trip.trip_code})
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}
              </div>

              <div className="flex gap-2">

                 {isSupervisor ? (
    <button
      onClick={() => handleEdit(vehicle)}
      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
    >
      <Search className="mr-2 h-4 w-4" />
      View
    </button>
  ) : (
    <>
      <button
        onClick={() => handleEdit(vehicle)}
        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </button>

      <button
        onClick={() => handleDelete(vehicle.id)}
        disabled={!canDeleteVehicle(vehicle.id)}
        className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          canDeleteVehicle(vehicle.id)
            ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
            : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
        }`}
        title={!canDeleteVehicle(vehicle.id) ? `Cannot delete: Vehicle has ${getVehicleTrips(vehicle.id).length} associated trip(s)` : ''}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </button>
    </>
  )}


                </div>

              
              
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <VehicleModal
          vehicle={editingVehicle}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

export default Vehicles

