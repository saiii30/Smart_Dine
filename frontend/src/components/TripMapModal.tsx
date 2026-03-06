import { useState, useEffect, useCallback } from 'react'
import { X, Navigation } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import axios from 'axios'
import API from '../api/axiosConfig'

// // Fix default marker icon issue in Leaflet with Webpack/Vite
// import icon from 'leaflet/dist/images/marker-icon.png'
// import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Custom icons
const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

const endIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

// Car Emoji Icon
const carIcon = L.divIcon({
    html: '<div style="font-size: 40px; line-height: 40px;">🚕</div>',
    className: 'emoji-car-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
})

const passengerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png', // Small passenger icon as requested
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    shadowSize: [24, 24]
})

interface TripMapModalProps {
    schedule: any
    onClose: () => void
}

const TripMapModal = ({ schedule, onClose }: TripMapModalProps) => {
    const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null)
    const [startCoords, setStartCoords] = useState<[number, number] | null>(null)
    const [endCoords, setEndCoords] = useState<[number, number] | null>(null)
    const [routePath, setRoutePath] = useState<[number, number][]>([])
    const [pickupPoints, setPickupPoints] = useState<{ id: number, coords: [number, number], name: string }[]>([])
    const [loading, setLoading] = useState(true)

    // Animation States
    // Animation States Removed

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)

            // Geocoding Helper
            const fetchCoords = async (query: string) => {
                if (!query) return null
                const cleanQuery = query.trim().toLowerCase()

                // Local Directory for Chennai Locations (Robust Fallback)
                const locationMap: Record<string, [number, number]> = {
                    "tambaram": [12.9229, 80.1275],
                    "sholinganallur": [12.9010, 80.2279],
                    "guindy": [13.0067, 80.2206],
                    "velachery": [12.9815, 80.2180],
                    "mylapore": [13.0368, 80.2676],
                    "adyar": [13.0012, 80.2565],
                    "t.nagar": [13.0418, 80.2341],
                    "porur": [13.0382, 80.1565],
                    "chromepet": [12.9516, 80.1462],
                    "pallavaram": [12.9675, 80.1491],
                    "thiruvanmiyur": [12.9830, 80.2594],
                    "medavakkam": [12.9171, 80.1923],
                    "navalur": [12.8439, 80.2304],
                    "siruseri": [12.8256, 80.2223],
                    "kelambakkam": [12.7876, 80.2206],
                    "chennai": [13.0827, 80.2707]
                }

                // Check for exact or partial match in local map
                for (const [key, coords] of Object.entries(locationMap)) {
                    if (cleanQuery.includes(key)) return coords
                }

                try {
                    let res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}`)
                    if (res.data && res.data.length > 0) return [parseFloat(res.data[0].lat), parseFloat(res.data[0].lon)] as [number, number]

                    res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ", Chennai")}`)
                    if (res.data && res.data.length > 0) return [parseFloat(res.data[0].lat), parseFloat(res.data[0].lon)] as [number, number]

                } catch (e) { console.warn("Geocoding failed", e) }
                return null
            }

            const start = await fetchCoords(schedule.starting_point)
            const end = await fetchCoords(schedule.end_point)

            // Initial Driver Fetch (Real)
            let driver: [number, number] | null = null
            if (schedule.driver_id) {
                try {
                    const res = await API.get(`/locations/drivers/${schedule.driver_id}/current`)
                    if (res.data && res.data.latitude && res.data.longitude) {
                        driver = [res.data.latitude, res.data.longitude]
                    }
                } catch (e) {
                    console.warn("Could not fetch initial driver location", e)
                }
            }

            setStartCoords(start)
            setEndCoords(end)
            setDriverLocation(driver)

            // Generate Pickups
            const points: { id: number, coords: [number, number], name: string }[] = []
            if (schedule.route_points && Array.isArray(schedule.route_points) && schedule.route_points.length > 0) {
                schedule.route_points.forEach((rp: any, i: number) => {
                    if (rp.starting_lat && rp.starting_lng) {
                        points.push({
                            id: i,
                            coords: [rp.starting_lat, rp.starting_lng],
                            name: rp.passenger_name || `Passenger ${i + 1}`
                        })
                    }
                })
            } else if (start) {
                const count = schedule.passenger_count || 1
                points.push({ id: 0, coords: start, name: "Pickup Point (Main)" })
                for (let i = 1; i < count; i++) {
                    const offsetLat = (Math.random() - 0.5) * 0.005
                    const offsetLon = (Math.random() - 0.5) * 0.005
                    points.push({
                        id: i,
                        coords: [start[0] + offsetLat, start[1] + offsetLon],
                        name: `Passenger ${i + 1} (Area Point)`
                    })
                }
            }
            setPickupPoints(points)

            // Fetch Route & Start Animation with Robust Fallback
            if (start && end) {
                const fetchRoute = async (baseUrl: string) => {
                    const url = `${baseUrl}/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
                    const response = await fetch(url)
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
                    return await response.json()
                }

                try {
                    // Try OpenStreetMap.de first (often more reliable)
                    let data
                    try {
                        data = await fetchRoute('https://routing.openstreetmap.de/routed-car')
                    } catch (e) {
                        console.warn("Primary OSRM failed, trying backup...")
                        data = await fetchRoute('https://router.project-osrm.org')
                    }

                    if (data && data.routes && data.routes.length > 0) {
                        const path = data.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]])
                        setRoutePath(path)
                    } else {
                        throw new Error("No routes found")
                    }
                } catch (e: any) {
                    console.error("All route fetch attempts failed", e)
                    // Inform user nicely
                    alert(`Route generation failed. Please check internet connection or try again later. Error: ${e.message}`)
                }
            }

            setLoading(false)
        }
        fetchData()
    }, [schedule])

    // Live Polling for Driver Location
    useEffect(() => {
        if (!schedule.driver_id) return

        let isPollingActive = true;

        console.log("-----------------------------------------");
        console.log("🚩 FLAG STATUS: isPollingActive =", isPollingActive, "(Map currently OPEN)");
        console.log("Map Opened: Started polling location for driver", schedule.driver_id);
        console.log("-----------------------------------------");

        const pollDriverLocation = async () => {

            if (!isPollingActive) {
                console.log("Blocked! Map is closed, API will not be called.");
                return;
            }

            console.log("Polling... fetching latest location from backend");
            try {
                const res = await API.get(`/locations/drivers/${schedule.driver_id}/current`)
                if (res.data && res.data.latitude && res.data.longitude) {
                    setDriverLocation([res.data.latitude, res.data.longitude])
                }
            } catch (e) {

                console.log("Polling error:", e);
            }
        }

        // Poll every 2 seconds
        const interval = setInterval(pollDriverLocation, 2000)

        // Idhudhaan Cleanup Function (Map Close aagumbodhu mattum idi call aagum)
        return () => {

            isPollingActive = false;

            console.log("-----------------------------------------");
            console.log("🚩 FLAG STATUS CHANGED! isPollingActive =", isPollingActive, "(Map is now CLOSED)");
            console.log("Map Closed: clearInterval triggered! Polling stopped completely.");
            console.log("-----------------------------------------");

            clearInterval(interval);
        }
    }, [schedule.driver_id])

    // Animation Loop
    // Animation Loop Removed

    // Replay Function
    // Replay Function Removed

    // Bounds Logic
    const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null)
    useEffect(() => {
        const points: [number, number][] = []
        if (startCoords) points.push(startCoords)
        if (endCoords) points.push(endCoords)
        if (driverLocation) points.push(driverLocation)

        pickupPoints.forEach(p => points.push(p.coords))
        if (routePath.length > 0) points.push(routePath[Math.floor(routePath.length / 2)])

        if (points.length > 0) setBounds(L.latLngBounds(points.map(p => [p[0], p[1]])))
    }, [startCoords, endCoords, driverLocation, routePath, pickupPoints])

    const BoundsUpdater = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
        const map = useMap()
        useEffect(() => {
            if (bounds) map.fitBounds(bounds, { padding: [50, 50] })
        }, [bounds, map])
        return null
    }

    // MapClickHandler and handleManualMove removed

    // Animation Hook
    const useAnimatedPosition = (targetPos: [number, number] | null, routePath: [number, number][]) => {
        const [currentPos, setCurrentPos] = useState(targetPos)
        const [prevTarget, setPrevTarget] = useState(targetPos)

        // Helper to find closest point on path for exact positioning
        const getClosestIdx = useCallback((pos: [number, number]) => {
            if (!routePath || routePath.length === 0) return -1;
            let minIdx = -1;
            let minD = Infinity;
            for (let i = 0; i < routePath.length; i++) {
                const d = Math.pow(routePath[i][0] - pos[0], 2) + Math.pow(routePath[i][1] - pos[1], 2);
                if (d < minD) {
                    minD = d;
                    minIdx = i;
                }
            }
            return minIdx;
        }, [routePath])

        useEffect(() => {
            if (!targetPos) return

            // Wait for routePath to be available before initial path-based snap
            if (!currentPos || routePath.length === 0) {
                setCurrentPos(targetPos)
                setPrevTarget(targetPos)
                return
            }

            if (prevTarget && targetPos[0] === prevTarget[0] && targetPos[1] === prevTarget[1]) {
                return
            }
            setPrevTarget(targetPos)

            const startIdx = getClosestIdx(currentPos)
            const endIdx = getClosestIdx(targetPos)

            // Force snap: override the ultimate target position to literally BE the snapped point
            const snappedTargetPos = endIdx !== -1 ? routePath[endIdx] : targetPos;

            let animationFrameId: number
            const startTime = performance.now()
            const duration = 1500 // 1.5s duration

            if (startIdx !== -1 && endIdx !== -1 && startIdx !== endIdx) {
                const step = startIdx <= endIdx ? 1 : -1;
                const pathSlice: [number, number][] = [];

                for (let i = startIdx; i !== endIdx + step; i += step) {
                    pathSlice.push(routePath[i]);
                }

                const animateAlongPath = (time: number) => {
                    const elapsed = time - startTime
                    const progress = Math.min(elapsed / duration, 1)

                    const totalSegments = pathSlice.length - 1

                    if (totalSegments <= 0) {
                        setCurrentPos(snappedTargetPos)
                        return
                    }

                    const fractionalIndex = progress * totalSegments
                    const currentIndex = Math.floor(fractionalIndex)

                    if (currentIndex >= totalSegments) {
                        setCurrentPos(snappedTargetPos)
                        return
                    }

                    const nextIndex = currentIndex + 1
                    const segmentProgress = fractionalIndex - currentIndex

                    const p1 = pathSlice[currentIndex]
                    const p2 = pathSlice[nextIndex]

                    const newLat = p1[0] + (p2[0] - p1[0]) * segmentProgress
                    const newLng = p1[1] + (p2[1] - p1[1]) * segmentProgress

                    setCurrentPos([newLat, newLng])

                    if (progress < 1) {
                        animationFrameId = requestAnimationFrame(animateAlongPath)
                    } else {
                        setCurrentPos(snappedTargetPos)
                    }
                }
                animationFrameId = requestAnimationFrame(animateAlongPath)
            } else {
                // Fallback Linear
                const start = currentPos
                const end = snappedTargetPos

                const animateLinear = (time: number) => {
                    const elapsed = time - startTime
                    const progress = Math.min(elapsed / duration, 1)
                    const newLat = start[0] + (end[0] - start[0]) * progress
                    const newLng = start[1] + (end[1] - start[1]) * progress
                    setCurrentPos([newLat, newLng])

                    if (progress < 1) {
                        animationFrameId = requestAnimationFrame(animateLinear)
                    } else {
                        setCurrentPos(snappedTargetPos)
                    }
                }
                animationFrameId = requestAnimationFrame(animateLinear)
            }

            return () => cancelAnimationFrame(animationFrameId)
        }, [targetPos, targetPos?.[0], targetPos?.[1], routePath, getClosestIdx])

        return currentPos || targetPos
    }

    const center: [number, number] = driverLocation || startCoords || endCoords || [13.0827, 80.2707]
    const rawActiveLocation = driverLocation || startCoords
    const activeLocation = useAnimatedPosition(rawActiveLocation, routePath)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col z-10 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                {schedule.company_name || 'Trip Details'}
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-medium text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30">
                                    LIVE TRACKING
                                </span>
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{schedule.starting_point?.replace(/,? ?Chennai/i, '')}</span>
                                <Navigation className="h-3 w-3 rotate-90" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">{schedule.end_point?.replace(/,? ?Chennai/i, '')}</span>
                            </div>
                            <div className="flex gap-4 text-xs mt-1">
                                {schedule.driver_name && <span>Driver: {schedule.driver_name}</span>}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>

                {/* Map */}
                <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">

                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <MapContainer
                            center={center}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <BoundsUpdater bounds={bounds} />

                            {pickupPoints.map(p => (
                                <Marker key={p.id} position={p.coords} icon={passengerIcon}>
                                    <Popup>{p.name}</Popup>
                                </Marker>
                            ))}

                            {startCoords && (
                                <Marker position={startCoords} icon={startIcon}>
                                    <Popup>Start</Popup>
                                </Marker>
                            )}

                            {endCoords && (
                                <Marker position={endCoords} icon={endIcon}>
                                    <Popup>End</Popup>
                                </Marker>
                            )}

                            {/* Animated Car */}
                            {activeLocation && (
                                <Marker position={activeLocation} icon={carIcon} zIndexOffset={1000}>
                                    <Popup>Live Driver 🚕</Popup>
                                </Marker>
                            )}

                            {routePath.length > 0 ? (
                                <Polyline positions={routePath} color="#3b82f6" weight={5} opacity={0.7} />
                            ) : (
                                startCoords && endCoords && (
                                    <Polyline positions={[startCoords, endCoords]} color="gray" dashArray="5, 10" />
                                )
                            )}
                        </MapContainer>
                    )}

                    {/* Legend */}
                    <div className="absolute bottom-6 left-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-xl shadow-lg z-[1000] text-xs space-y-3 border border-gray-200 dark:border-gray-700 w-48 transition-all hover:scale-105">
                        <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">Map Legend</div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 flex justify-center"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" className="h-5" alt="Start" /></div>
                            <span>Start Point</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 flex justify-center"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" className="h-5" alt="End" /></div>
                            <span>End Point</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 flex justify-center"><img src="https://cdn-icons-png.flaticon.com/512/9131/9131529.png" className="h-5" alt="Passenger" /></div>
                            <span>Passenger</span>
                        </div>
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="w-8 flex justify-center text-3xl">🚕</div>
                            <div><span className="text-green-600 font-bold">Live Driver</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TripMapModal
