import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { Plus, Edit, Trash2, MapPin, Search, Users } from 'lucide-react'
import { Trip, Company } from '../types'
import TripModal from '../components/TripModal'
import { useAuth } from '../contexts/AuthContext'

const Trips = () => {
  const [trips, setTrips] = useState<Trip[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const { user } = useAuth()
     const isSuperAdmin = user?.role === 'SUPER_ADMIN'
   const isAdmin = user?.role === 'ADMIN'
   const isSupervisor = user?.role === 'SUPERVISOR'
  
  // Fetch trips and companies on mount
  useEffect(() => {
    fetchTrips()
    fetchCompanies()
  }, [])

  // Fetch trips whenever selected company changes
  useEffect(() => {
    fetchTrips()
  }, [selectedCompany])

 

  const fetchTrips = async () => {
  try {
    const response = await axios.get(
      'http://127.0.0.1:8000/api/trip-schedules'
    )

    const schedules = Array.isArray(response.data) ? response.data : []

    const tripMap: Record<string, Trip> = {}

    schedules.forEach((sch: any) => {
      const tripId = sch.trip_id || sch.id   // fallback safety

      if (!tripId) return   // ⛔ skip bad data

      if (!tripMap[tripId]) {
        tripMap[tripId] = {
          id: tripId,
          
          user_id: sch.user_id ?? '',
          agency_id: sch.agency_id,
          company_id: sch.company_id,
          company_name: sch.company_name,
          company_branch: sch.company_branch,

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
        start_time: sch.start_time,
        end_time: sch.end_time,
        starting_point: sch.starting_point,
        end_point: sch.end_point,
        way: sch.way,
        trip_type: sch.trip_type,
        passenger_count: sch.passenger_count ?? 0,
        notes: sch.notes,
        vehicle_id: sch.vehicle_id,
        distance_km: sch.distance_km,
        duration_min: sch.duration_min,
        starting_lat: sch.starting_lat,
        starting_lng: sch.starting_lng,
        end_lat: sch.end_lat,
        end_lng: sch.end_lng,

        route_points: sch.route_points ,

        
        
        vehicle_number: sch.vehicle_number,
        driver_id: sch.driver_id,
        vehicle_registration_number: sch.vehicle_registration_number,
        driver_name: sch.driver_name,
        is_active: sch.is_active ?? true,
        created_at: sch.created_at,
        updated_at: sch.updated_at,
      })
    })

    setTrips(Object.values(tripMap))
  } catch (error) {
    console.error('Failed to fetch trips:', error)
  } finally {
    setLoading(false)
  }
}


  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/trips/companies/')
      setCompanies(response.data)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  // Modal handlers
  const handleCreate = () => {
    setEditingTrip(null)
    setIsModalOpen(true)
  }

  const handleEdit = (trip: Trip) => {
    console.log('Editing trip:', JSON.stringify(trip, null, 2)) // Debug log
    setEditingTrip(trip)
    setIsModalOpen(true)
  }

  

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this trip?')) return

    try {
      await axios.delete(`http://127.0.0.1:8000/api/trip-schedules/${id}`)
      fetchTrips()
    } catch (error) {
      console.error('Failed to delete trip:', error)
      alert('Failed to delete trip')
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingTrip(null)
  }

  const handleModalSuccess = () => {
    fetchTrips()
    handleModalClose()
  }

  // Filter trips based on search query
  const filteredTrips = useMemo(() => {
    let filtered = trips
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = trips.filter((trip) => {
      
        const companyMatch = trip.company_name?.toLowerCase().includes(query)
        const addressMatch = trip.address?.toLowerCase().includes(query)
       
        return   companyMatch || addressMatch 
      })
    }
    return filtered
  }, [trips, searchQuery])

  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trips</h1>
        <div className="flex flex-1 md:max-w-2xl items-center gap-4 w-full md:w-auto">
    

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
                      {schedules.slice(0, 3).map((schedule, idx) => (
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
        onClick={() => handleDelete(trip.id)}
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
    </div>
  )
}

export default Trips
