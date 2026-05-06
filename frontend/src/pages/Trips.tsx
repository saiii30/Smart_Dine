import { useEffect, useState, useMemo } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { Plus, Edit, Trash2, MapPin, Search, Users } from 'lucide-react'
import { Trip, Company } from '../types'
import TripModal from '../components/TripModal'
import { api } from '../api/api'
import DeleteModal from '../components/DeleteModal'
import { useAuth } from '../contexts/AuthContext'

const Trips = () => {
  const MAX_SCHEDULE_PREVIEW = 3
  const [trips, setTrips] = useState<Trip[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [fetchingTrips, setFetchingTrips] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchingCompanies, setFetchingCompanies] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
   const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const { user } = useAuth()
  
  const isSupervisor = user?.role === 'SUPERVISOR'
  
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }
  
  useEffect(() => {
    const controller = new AbortController()

    fetchTrips(controller.signal)
    fetchCompanies(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

const fetchTrips = async (signal?: AbortSignal) => {
  setFetchingTrips(true)
  
  try {
    const response = await api.get('/trip-schedules/', { signal })

    const schedules = Array.isArray(response.data) ? response.data : []

    const tripMap: Record<string, Trip> = {}

    

    schedules.forEach((sch: any) => {
      const tripId = sch.trip_id ?? sch.id

      if (!tripId) return   // ⛔ skip bad data

      if (!tripMap[tripId]) {
        tripMap[tripId] = {
          id: tripId,
          
          user_id: sch.user_id ?? '',
          agency_id: sch.agency_id ?? '',
          company_id: sch.company_id ?? '',
          company_name: sch.company_name ?? 'Unknown Company',
          company_branch: sch.company_branch ?? '',
          address: sch.address ?? '',

          is_active: sch.is_active ?? true,
          created_at: sch.created_at ?? new Date().toISOString(),

          passenger_count: sch.passenger_count ?? 0,
          
          schedules: [],
        }
      }

      // push ONLY clean schedule object
      tripMap[tripId].schedules.push({
        id: sch.id,
        trip_id: sch.trip_id,
        start_date: sch.start_date,
        end_date: sch.end_date,

        one_way_isActive: sch.one_way_isActive,
        two_way_isActive: sch.two_way_isActive,
        one_way_start_time: sch.one_way_start_time,
        two_way_start_time: sch.two_way_start_time,
        starting_point: sch.starting_point,
        end_point: sch.end_point,
        way: sch.way,
        trip_type: sch.trip_type,
        passenger_count: sch.passenger_count ?? 0,
        notes: sch.notes ?? '',
        vehicle_id: sch.vehicle_id ?? '',
        distance_km:  sch.distance_km ?? 0,
        duration_min: sch.duration_min ?? 0,
        starting_lat: sch.starting_lat ?? 0,
        starting_lng: sch.starting_lng ?? 0,
        end_lat: sch.end_lat ?? 0,
        end_lng: sch.end_lng ?? 0,

        route_point: sch.route_point ,

        
        
        vehicle_number: sch.vehicle_number ?? '', 
        driver_id: sch.driver_id ?? '',
        vehicle_registration_number: sch.vehicle_registration_number ?? '',
        driver_name: sch.driver_name ?? '',
        is_active: sch.is_active ?? true,
        created_at: sch.created_at,
        updated_at: sch.updated_at,
      })
    })
    setError(null)
    setTrips(Object.values(tripMap))
    showNotification('success', 'Trips loaded successfully')
  } catch (error : any) {
   
  // ✅ handle ALL cancel cases
  if (
    error.name === 'CanceledError' ||
    error.code === 'ERR_CANCELED'
  ) {
    return
  }

  console.error('Failed to fetch trips:', error)
  setError('Failed to load trips. Please try again.')
  showNotification('error', 'Failed to load trips. Please try again.')

  } finally {
    setFetchingTrips(false)
  
  }
}


  // Fetch companies
const fetchCompanies = async (signal?: AbortSignal) => {
  const agencyId = localStorage.getItem('selectedAgencyId')

  if (!agencyId) return

  setFetchingCompanies(true)

  try {
    const response = await api.get(
      `/companies/trip/dropdown/?agency_id=${agencyId}`,
      { signal }
    )

    setCompanies(response.data)

    // ✅ CLEAR ERROR ON SUCCESS
    setError(null)
    showNotification('success', 'Companies loaded successfully')

  } catch (error: any) {

    if (error.name === 'CanceledError') return

    console.error('Failed to fetch companies:', error)

    setError('Failed to load companies')
    showNotification('error', 'Failed to load companies')
  } finally {
    const startTime = Date.now()
    const elapsed = Date.now() - startTime
    const minLoadingTime = 800 // minimum 800ms loading
    
    setTimeout(() => {
      setFetchingCompanies(false)
      setLoading(false)
    }, Math.max(0, minLoadingTime - elapsed))
  }
}

  // Modal handlers
  const handleCreate = () => {
    setEditingTrip(null)
    setIsModalOpen(true)
  }

  const handleEdit = (trip: Trip) => {
   
    setEditingTrip(trip)
    setIsModalOpen(true)
  }

  const handleDeleteClick = (id: string) => {
  setDeleteId(id)
  setShowConfirm(true)
}

const confirmDelete = async () => {
  if (deleteId === null) return

  setDeleteLoading(true)

  try {
    await api.delete(`/trip-schedules/${deleteId}`)
    fetchTrips()
    showNotification('success', 'Trip deleted successfully')
  } catch (error: any) {
  console.error('Failed to delete trip:', error)

  setError(
    error?.response?.data?.message ||
    'Failed to delete trip. Please try again.'
  )
  showNotification('error', error?.response?.data?.message || 'Failed to delete trip. Please try again.')
}finally {
    setDeleteLoading(false)
    setShowConfirm(false)
    setDeleteId(null)
  }
}
  


  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingTrip(null)
  }

  const handleModalSuccess = () => {
    fetchTrips()
    handleModalClose()
    showNotification('success', editingTrip ? 'Trip updated successfully' : 'Trip created successfully')
  }

  // Filter trips based on search query
const filteredTrips = useMemo(() => {
  const query = debouncedSearch.toLowerCase().trim()

  return trips.filter((trip) => {
    const matchesSearch =
      !query ||
      (trip.company_name ?? '').toLowerCase().includes(query) ||
      (trip.address ?? '').toLowerCase().includes(query)

    const matchesCompany =
      !selectedCompany || String(trip.company_id) === selectedCompany

    return matchesSearch && matchesCompany
  })
}, [trips, debouncedSearch, selectedCompany])
  

 

   if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading trips...</p>
            </div>
        )
    }

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
    {error}
  </div>
)}
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trips</h1>
        <div className="flex flex-1 md:max-w-2xl items-center gap-4 w-full md:w-auto">


         <select
  value={selectedCompany}
  onChange={(e) => setSelectedCompany(e.target.value)}
  className="px-4 py-2 border rounded-lg"
  disabled={fetchingCompanies}
>
  <option value="">All Companies</option>

  {fetchingCompanies ? (
    <option disabled>Loading companies...</option>
  ) : companies.length === 0 ? (
    <option disabled>No companies found</option>
  ) : (
    companies.map((c) => (
      <option key={c.id} value={c.id}>
        {c.company_name}
      </option>
    ))
  )}
</select>
        

          {/* Search Bar */}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-white" />
            <input
              type="text"
              placeholder="Search trips..."
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
    Add Trip
  </button>
)}
        </div>
      </div>

      {/* Trip List */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 dark:text-white mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() || selectedCompany ? 'No trips found' : 'No trips'}
          </h3>
          <p className="text-gray-500 dark:text-white mb-4">
            {searchQuery.trim() || selectedCompany
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding your first trip.'}
          </p>

          
          {!searchQuery.trim() && !selectedCompany && !isSupervisor && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Trip
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => {
            const schedules = trip.schedules ?? [] // ⚡ default to empty array

            return (
              <div
                key={trip.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                   
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{trip.company_name}</h3>
                   
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      trip.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {trip.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {trip.address && (
                  <p className="text-sm text-gray-600 dark:text-white mb-4 line-clamp-2">
                    {trip.address}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-white">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>
                      {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {schedules.length > 0 && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-white">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{schedules.reduce((sum, s) => sum + (s.passenger_count ?? 0), 0)} total passengers</span>
                    </div>
                  )}
                </div>

                {/* Schedules Preview */}
                {schedules.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                   
                    <div className="space-y-2">
                      {schedules.slice(0, MAX_SCHEDULE_PREVIEW).map((schedule, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-gray-600 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2 last:border-0"
                        >
                        
                          {schedule.vehicle_registration_number && (
                            <div className="text-gray-500 dark:text-white">
                              Vehicle: {schedule.vehicle_registration_number}
                            </div>
                          )}
                          {schedule.driver_name && (
                            <div className="text-gray-500 dark:text-white">
                              Driver: {schedule.driver_name}
                            </div>
                          )}
                          {schedule.passenger_count > 0 && (
                            <div className="text-gray-500 dark:text-white">
                              Passengers: {schedule.passenger_count}
                            </div>
                          )}
                        </div>
                      ))}
                     
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">

  {isSupervisor ? (
    <button
      onClick={() => handleEdit(trip)}
      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
    >
      <Search className="mr-2 h-4 w-4" />
      View
    </button>
  ) : (
    <>
      <button
        onClick={() => handleEdit(trip)}
        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </button>

      <button
        onClick={() => handleDeleteClick(trip.id)}
        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </button>
    </>
  )}

</div>
              </div>
            )
          })}
        </div>
      )}

      {isModalOpen && (
        <TripModal
          trip={editingTrip}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {showConfirm && (
  <DeleteModal
    title="Delete Trip"
    message="Are you sure you want to delete this trip? This action cannot be undone."
    onCancel={() => setShowConfirm(false)}
    onConfirm={confirmDelete}
    loading={deleteLoading}
  />
)}
    </div>
  )
}

export default Trips
