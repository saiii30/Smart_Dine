import { useEffect, useState } from 'react'
import API from '../api/axiosConfig'
import { MapPin, Search, Navigation } from 'lucide-react'
import TripMapModal from '../components/TripMapModal'
import { useMemo } from 'react'
import { Schedule } from '../types'

const LiveTracking = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
    const [isMapModalOpen, setIsMapModalOpen] = useState(false)

    useEffect(() => {
        fetchSchedules()
    }, [])

    useEffect(() => {
    const interval = setInterval(() => {
        fetchSchedules()
    }, 5000)

    return () => clearInterval(interval)
}, [])

    const fetchSchedules = async () => {
    try {
       

       

        const [scheduleRes, driverLocRes] = await Promise.all([
    API.get('/trip-schedules/'),
    API.get('/mobile/locations/all/')
])

        const schedulesData = Array.isArray(scheduleRes.data) ? scheduleRes.data : []
        const driverLocations = Array.isArray(driverLocRes.data) ? driverLocRes.data : []

        // ✅ Active driver மட்டும்
        const activeDriverLocations = driverLocations.filter(
            (d: any) => Boolean(Number(d.is_active))
        )

        const allSchedules: any[] = []

        schedulesData.forEach((trip: any) => {

            // 🔥 matching active driver
            const driverActive = activeDriverLocations.find(
                (d: any) => String(d.trip_id) === String(trip.id)
            )

      
            // ❌ driver active இல்லனா skip
            if (!driverActive) return

            const scheduleObj = {
                id: trip.id,
                trip_id: trip.id,
                company_name: trip.company_name,

                vehicle_registration_number:
                    trip.vehicle_registration_number ||
                    trip.vehicle?.vehicle_registration_number ||
                    'Unassigned',

                driver_name:
                    trip.driver_name ||
                    trip.driver?.user?.name ||
                    trip.driver?.full_name ||
                    'Unassigned',

                starting_point: trip.starting_point,
                end_point: trip.end_point,
                start_date: trip.start_date,
                start_time: trip.start_time,
                passenger_count: trip.passenger_count,
                trip_type: trip.trip_type,
                route_point: trip.route_point,

                status: trip.is_active ? 'Active' : 'Inactive',

                driver_id: trip.driver_id,

                driver_phone:
                    trip.driver?.user?.contact_number ||
                    trip.driver_phone 
            }

            allSchedules.push(scheduleObj)
        })

        setSchedules(allSchedules)

    } catch (error) {
        console.error('Failed to fetch schedules:', error)
    } finally {
        setLoading(false)
    }
}
   

    const handleOpenMap = (schedule: any) => {
        setSelectedSchedule(schedule)
        setIsMapModalOpen(true)
    }

    const filteredSchedules = useMemo(() => {
    return schedules.filter(s =>
        s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.vehicle_registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.driver_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
}, [schedules, searchQuery])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Navigation className="h-8 w-8 text-primary-600" />
                        Live Tracking
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Track active trips and vehicle locations in real-time</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search driver, vehicle..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchedules.map((schedule) => (
                    <div key={schedule.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{schedule.company_name}</h3>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                        Live
                                    </span>
                                </div>
                                <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                    <Navigation className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-24 text-gray-400">Route</div>
                                    <div className="font-medium truncate">
                                        {schedule.starting_point?.replace(/,? ?Chennai/i, '')} → {schedule.end_point?.replace(/,? ?Chennai/i, '')}
                                    </div>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-24 text-gray-400">Driver</div>
                                    <div className="font-medium">
                                        {schedule.driver_name || 'Unassigned'}
                                        {schedule.driver_phone && (
                                            <span className="ml-2 text-xs text-gray-500 font-normal">
                                                ({schedule.driver_phone})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-24 text-gray-400">Vehicle</div>
                                    <div className="font-medium">{schedule.vehicle_registration_number || 'Unassigned'}</div>
                                </div>
                                
                            </div>

                            <button
                                onClick={() => handleOpenMap(schedule)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
                            >
                                <MapPin className="h-4 w-4" />
                                Track Location
                            </button>
                        </div>
                    </div>
                ))}

                {filteredSchedules.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                        No active trips found matching your search.
                    </div>
                )}
            </div>

            {isMapModalOpen && selectedSchedule && (
                <TripMapModal
                    schedule={selectedSchedule}
                    onClose={() => setIsMapModalOpen(false)}
                />
            )}
        </div>
    )
}

export default LiveTracking
