import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { api } from '../api/api'
import { Plus, Edit, Trash2, Car, Search, AlertCircle, RefreshCw } from 'lucide-react'
import { Vehicle, TripSchedule } from '../types'
import VehicleModal from '../components/VehicleModal'
import VehicleViewModal from '../components/VehicleViewModal'
import { useAuth } from '../contexts/AuthContext'


// Permission utility
const usePermissions = () => {
  const { user } = useAuth()
  return {
    canManageVehicles: user?.role !== "SUPERVISOR"
  }
}

const Vehicles = () => {
  const { canManageVehicles } = usePermissions()
  const { user } = useAuth()
  console.log('Vehicles component - User role:', user?.role, 'canManageVehicles:', canManageVehicles)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trips, setTrips] = useState<TripSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    fetchVehicles()
    fetchTrips()
  }, [])

  const fetchVehicles = async () => {
    try {
      setError(null)
      abortControllerRef.current = new AbortController()
      const response = await api.get(`/vehicles/`, {
        signal: abortControllerRef.current.signal
      })
      setVehicles(response.data)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch vehicles:', error)
        setError('Failed to fetch vehicles. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchTrips = async () => {
    try {
      abortControllerRef.current = new AbortController()
      const response = await api.get(`/trips/`, {
        signal: abortControllerRef.current.signal
      })
      setTrips(response.data)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch trips:', error)
        // Don't set error state for trips failure - vehicles can still work without trips
        // Just log the error and set empty trips array
        setTrips([])
      }
    }
  }

  // Memoized vehicle trips calculation
  const getVehicleTrips = useCallback((vehicleId: string): TripSchedule[] => {
    if (!trips || !Array.isArray(trips)) return []
    return trips.filter(trip => trip.vehicle_id === vehicleId)
  }, [trips])

  const canDeleteVehicle = useCallback((vehicleId: string): boolean => {
    const vehicleTrips = getVehicleTrips(vehicleId)
    return vehicleTrips.length === 0
  }, [getVehicleTrips])

  
  const handleCreate = () => {
    console.log('handleCreate called, canManageVehicles:', canManageVehicles)
    setEditingVehicle(null)
    setIsModalOpen(true)
    console.log('isModalOpen set to true')
    // Clear any existing form data from localStorage to ensure clean form
    try {
      localStorage.removeItem('vehicle_modal_draft_v1')
    } catch (e) {
      // Log error but don't break the flow - localStorage might be disabled
      console.warn('localStorage access failed:', e)
      // Could add toast notification here if needed
    }
  }

  const handleEdit = async (vehicle: Vehicle) => {
    try {
      // Fetch complete vehicle details to ensure all fields are available
      const response = await api.get(`/vehicles/${vehicle.id}`)
      setEditingVehicle(response.data)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to fetch vehicle details:', error)
      setError('Failed to fetch vehicle details. Please try again.')
      // Fallback to using the basic vehicle data if detailed fetch fails
      setEditingVehicle(vehicle)
      setIsModalOpen(true)
    }
  }

  const handleDelete = async (id:string) => {
    setShowDeleteModal(id)
  }

  const confirmDelete = async () => {
    if (!showDeleteModal) return

    try {
      await api.delete(`/vehicles/${showDeleteModal}`)
      setVehicles(prev => prev.filter(v => v.id !== showDeleteModal))
      setShowDeleteModal(null)
    } catch (error: any) {
      console.error('Failed to delete vehicle:', error)
      
      // Extract detailed error message from backend response
      let errorMessage = 'Failed to delete vehicle'
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(null)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingVehicle(null)
  }

  const handleModalSuccess = (newVehicle?: Vehicle) => {
    if (newVehicle) {
      if (editingVehicle) {
        // Update existing vehicle
        setVehicles(prev => prev.map(v => v.id === newVehicle.id ? newVehicle : v))
      } else {
        // Add new vehicle
        setVehicles(prev => [...prev, newVehicle])
      }
    } else {
      // If no vehicle data provided (e.g., bulk upload), refresh the list
      fetchVehicles()
    }
    handleModalClose()
  }

  const handleView = (vehicle: Vehicle) => {
    setViewingVehicle(vehicle)
    setIsViewModalOpen(true)
  }

  const handleViewModalClose = () => {
    setIsViewModalOpen(false)
    setViewingVehicle(null)
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
    if (!debouncedSearchQuery.trim()) {
      return vehicles
    }
    const query = debouncedSearchQuery.toLowerCase().trim()
    return vehicles.filter((vehicle) => {
      const vehicleNumberMatch = vehicle.vehicle_registration_number.toLowerCase().includes(query)
      const modelMatch = vehicle.vehicle_model.toLowerCase().includes(query)
      const typeMatch = vehicle.vehicle_type.toLowerCase().includes(query)
      return vehicleNumberMatch || modelMatch || typeMatch
    })
  }, [vehicles, debouncedSearchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  // Error boundary component
  const ErrorBoundary = ({ error, onRetry }: { error: string | null; onRetry: () => void }) => {
    if (!error) return null
    
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              {error}
            </p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ErrorBoundary 
        error={error} 
        onRetry={() => {
          setError(null)
          fetchVehicles()
          fetchTrips()
        }} 
      />
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
          canManageVehicles && (
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

          {canManageVehicles && (
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
                <button
                  onClick={() => handleView(vehicle)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Search className="mr-2 h-4 w-4" />
                  View
                </button>
                
                {canManageVehicles && (
                  <>
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </button>

                    <div
                      className="relative"
                      onMouseEnter={() => setHoveredVehicleId(vehicle.id)}
                      onMouseLeave={() => setHoveredVehicleId(null)}
                    >
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        disabled={!canDeleteVehicle(vehicle.id)}
                        className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          canDeleteVehicle(vehicle.id)
                            ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                            : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </button>
                      
                      {/* Enhanced tooltip */}
                      {!canDeleteVehicle(vehicle.id) && hoveredVehicleId === vehicle.id && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10">
                          <div className="text-xs font-medium">
                            Cannot delete: Vehicle has {getVehicleTrips(vehicle.id).length} associated trip(s)
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      )}
                    </div>
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

      {isViewModalOpen && (
        <VehicleViewModal
          vehicle={viewingVehicle}
          onClose={handleViewModalClose}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 dark:bg-red-500 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Vehicles

