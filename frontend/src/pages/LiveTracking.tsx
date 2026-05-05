import { useEffect, useState,useRef } from 'react'

import { MapPin, Search, Navigation } from 'lucide-react'
import TripMapModal from '../components/TripMapModal'
import { useMemo } from 'react'
import { Schedule } from '../types'


const LiveTracking = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)
    const searchTimeout = useRef<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
    const [isMapModalOpen, setIsMapModalOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'disconnected'
>('connecting')

    const showNotification = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message })
      setTimeout(() => setNotification(null), 5000)
    }




    

    useEffect(() => {
    return () => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current)
        }
    }
}, [])


const handleSearchChange = (value: string) => {
    setSearchQuery(value)

    if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(() => {
        setSearchQuery(value)
    }, 300)
}

const wsRef = useRef<WebSocket | null>(null)

useEffect(() => {
    let retryCount = 0
    const maxRetries = 5

    const connectWebSocket = () => {
        if (wsRef.current) return   // 🔥 prevent duplicate

        setConnectionStatus(
            retryCount === 0 ? 'connecting' : 'reconnecting'
        )

        const baseUrl = import.meta.env.VITE_BACKEND_URL 
        const WS_URL = baseUrl.replace('http', 'ws')
        console.log(baseUrl)

        const parent_id = localStorage.getItem("selectedAgencyId")

const ws = new WebSocket(
  `${WS_URL}/api/locations/live?parent_id=${parent_id}`
)
        wsRef.current = ws

        ws.onopen = () => {
            console.log("✅ Live WS connected")
            setConnectionStatus('connected')
            setError(null)
            retryCount = 0
            showNotification('success', 'Connected to live tracking')
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                setSchedules(data)
                setLoading(false)
            } catch {
                setError("Invalid data received")
                showNotification('error', 'Invalid data received from server')
            }
        }

        ws.onerror = () => {
            setConnectionStatus('disconnected')
            setError("WebSocket error")
            showNotification('error', 'Connection error occurred')
        }

        ws.onclose = () => {
            wsRef.current = null   // 🔥 important

            if (retryCount < maxRetries) {
                retryCount++
                setTimeout(connectWebSocket, 2000)
            } else {
                setConnectionStatus('disconnected')
                setError("Connection failed")
                showNotification('error', 'Failed to connect to live tracking')
            }
        }
    }

    connectWebSocket()

    return () => {
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
    }
}, [])




// useEffect(() => {
//     const ws = new WebSocket('ws://127.0.0.1:8000/api/locations/live')

//     ws.onopen = () => {
//         console.log("✅ Live WS connected")
//     }

//     ws.onmessage = (event) => {
//         const data = JSON.parse(event.data)

//         console.log("🔥 LIVE DATA:", data)

//         setSchedules(data)   // 💥 DIRECT UI UPDATE
//         setLoading(false)
//     }

//     ws.onerror = (err) => {
//         console.error("❌ WS Error", err)
//     }

//     ws.onclose = () => {
//         console.log("⚠️ WS Closed")
//     }

//     return () => ws.close()
// }, [])

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
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading live tracking data...</p>
            </div>
        )
    }

    return (
        <div className="p-6">
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
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Navigation className="h-8 w-8 text-primary-600" />
                        Live Tracking
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
    <span className="text-sm text-gray-500">Status:</span>

    {connectionStatus === 'connected' && (
        <span className="text-green-600 text-sm font-medium">● Live</span>
    )}

    {connectionStatus === 'connecting' && (
        <span className="text-yellow-600 text-sm font-medium animate-pulse">
            ● Connecting...
        </span>
    )}

    {connectionStatus === 'reconnecting' && (
        <span className="text-orange-600 text-sm font-medium animate-pulse">
            ● Reconnecting...
        </span>
    )}

    {connectionStatus === 'disconnected' && (
        <span className="text-red-600 text-sm font-medium">
            ● Offline
        </span>
    )}
</div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Track active trips and vehicle locations in real-time</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search driver, vehicle..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
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
                    <div className="col-span-full text-center py-12">
                        <div className="flex flex-col items-center">
                            <div className="text-gray-500 dark:text-gray-400 mb-2">
                                {loading ? 'Loading schedules...' : 'No active trips found matching your search.'}
                            </div>
                            {!loading && searchQuery && (
                                <p className="text-sm text-gray-400">Try adjusting your search criteria.</p>
                            )}
                        </div>
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
