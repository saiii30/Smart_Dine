import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { Plus, Edit, Trash2, User, Search } from 'lucide-react'
import { Driver, Trip } from '../types'
import DriverModal from '../components/DriverModal'
import { useAuth } from '../contexts/AuthContext'
const Drivers = () => {
  const { user } = useAuth()

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = user?.role === "ADMIN";
  const isSupervisor = user?.role === "SUPERVISOR";
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchDrivers()
    fetchTrips()
  }, [])

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/drivers/')
      setDrivers(response.data)
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
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

  const getDriverTrips = (driverId: string): Trip[] => {
    return trips.filter(trip =>
      trip.schedules.some(schedule => schedule.driver_id === driverId)
    )
  }

  const handleCreate = () => {
    setEditingDriver(null)
    setIsModalOpen(true)
  }

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    console.log('Editing driver:', driver)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return

    try {
      await axios.delete(`http://127.0.0.1:8000/api/drivers/${id}`)
      fetchDrivers()
    } catch (error) {
      console.error('Failed to delete driver:', error)
      alert('Failed to delete driver')
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingDriver(null)
  }

  const handleModalSuccess = () => {
    fetchDrivers()
    handleModalClose()
  }

  // Filter drivers based on search query (driver name and phone number)
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) {
      return drivers
    }
    const query = searchQuery.toLowerCase().trim()
    return drivers.filter((driver) => {
      const nameMatch = driver.user.name.toLowerCase().includes(query)
      const phoneMatch = driver.user.contact_number?.toLowerCase().includes(query) || ''
      return nameMatch || phoneMatch
    })
  }, [drivers, searchQuery])

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Drivers</h1>
        <div className="flex flex-1 md:max-w-lg items-center gap-4 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Name / Phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {!isSupervisor && (
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors whitespace-nowrap"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Driver
            </button>
          )}
        </div>
      </div>

      {filteredDrivers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() ? 'No drivers found' : 'No drivers'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery.trim()
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding your first driver.'}
          </p>
          {!searchQuery.trim() && !isSupervisor && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Driver
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{driver.user.name}</h3>
                  {driver.user.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{driver.user.email}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${driver.status === 'Active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}
                >
                  {driver.status || 'Active'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{driver.user.contact_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">License:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{driver.driving_license_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">License Expiry:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {new Date(driver.license_expiry_date).toLocaleDateString()}
                  </span>
                </div>
                {driver.emergency_contact_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Emergency Contact:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {driver.emergency_contact_name}
                    </span>
                  </div>
                )}
                {/* {getDriverTrips(driver.id).length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned to:</div>
                    <div className="space-y-1">
                      {getDriverTrips(driver.id).map(trip => (
                        <div key={trip.id} className="text-xs font-medium text-primary-600 dark:text-primary-400">
                          {trip.name} ({trip.trip_code})
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}
              </div>

              <div className="flex gap-2">

                {/* Supervisor → Only View */}
                {isSupervisor ? (
                  <button
                    onClick={() => handleEdit(driver)}
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    View
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(driver)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(driver.id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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
        <DriverModal
          driver={editingDriver}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

export default Drivers

