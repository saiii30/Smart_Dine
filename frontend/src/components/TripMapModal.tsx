import { useState, useEffect, useCallback,useRef } from 'react'
import { X, Navigation } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { createWebSocket } from "../utils/websocket";

import axios from 'axios'
import API from '../api/axiosConfig'




// Custom icons
const startIcon = L.divIcon({
  html: '<div style="font-size:30px;">🏠</div>',
  className: '',
  iconSize: [50, 30],
  iconAnchor: [15, 30],   // 👈 bottom center (important)
  popupAnchor: [0, -30],
})

const droppedIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828640.png',
    iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828640.png', // ✅ add this
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
})

const redPassengerIcon = L.divIcon({
  html: `
    <img 
      src="https://cdn-icons-png.flaticon.com/512/9131/9131529.png"
      style="
        width:32px;
        height:32px;
        filter: hue-rotate(180deg) saturate(5) brightness(1);
      "
    />
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

const pickedPassengerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828640.png',
    iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828640.png', // ✅ add this
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
})
const endIcon = L.divIcon({
  html: '<div style="font-size:30px;">🏢</div>',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],   // 👈 important (bottom align)
  popupAnchor: [0, -30],
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
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png',
  iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
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
    const [pickupPoints, setPickupPoints] = useState<{ id: string, coords: [number, number], name: string, phone: string, pickup: string }[]>([])
    const [loading, setLoading] = useState(true)
   const [pickedMap, setPickedMap] = useState<{
  [id: string]: { pickup: boolean; ispresent: boolean; isdropped: boolean }
}>({})
    



    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)


         const fetchCoords = async (query: string): Promise<[number, number] | null> => {
  if (!query) return null;

  const clean = query
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const variations = [
    clean,
    clean.split(" ").slice(0, 5).join(" "),
    clean.split(" ").slice(-5).join(" "),
  ];

  for (let q of variations) {
    try {
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q,
            format: "json",
            limit: 1,
            countrycodes: "in",
          },
          
        }
      );

      if (res.data?.length > 0) {
        return [
          parseFloat(res.data[0].lat),
          parseFloat(res.data[0].lon),
        ];
      }
    } catch (e) {
      console.warn("Error:", q);
    }
  }

  console.error("❌ Failed:", query);
  return null;
};

            let startLocation = schedule.starting_point
           
let endLocation = schedule.end_point


const start = await fetchCoords(startLocation)
const end = await fetchCoords(endLocation)

            // Initial Driver Fetch (Real)
            let driver: [number, number] | null = null
            if (schedule.driver_id) {
                try {
                    const res = await axios.get(`api/mobile/locations?driver_id=${schedule.driver_id}`)
                    // const res = await API.get(`/locations/drivers/${schedule.driver_id}/current`)
                    if (res.data && res.data.latitude && res.data.longitude) {
                        driver = [res.data.latitude, res.data.longitude]
                      
                    }

                } catch (e) {
                    console.warn("Could not fetch initial driver location", e)
                }
            }

if (start) setStartCoords(start);
else console.warn("Start location failed");

if (end) setEndCoords(end);
else console.warn("End location failed");
            setDriverLocation(driver)

            // Generate Pickups
            const points: { id: string, coords: [number, number], name: string, phone: string, pickup: string }[] = []

            
// ✅ ROUTE TRIP (has passenger coordinates)
if (schedule.route_point && schedule.route_point.length > 0 && schedule.trip_type === "route") {

    let routePoints = fixRoutePoint(schedule.route_point);


routePoints.forEach((rp: any) => {
    if (rp.pickup_lat && rp.pickup_lng) {
        points.push({
            id: String(rp.passenger_id),
            coords: [rp.pickup_lat, rp.pickup_lng],
            name: rp.passenger_name,
            phone: rp.passenger_phone,
            pickup: rp.pickup_point
        })
    }
})


} 
else if (start && schedule.passenger_count && schedule.trip_type === "shuttle") {

    const passengerCount = schedule.passenger_count

    for (let i = 0; i < passengerCount; i++) {

        const angle = (i / passengerCount) * 2 * Math.PI
        const radius = 0.001

        const lat = start[0] + radius * Math.cos(angle)
        const lng = start[1] + radius * Math.sin(angle)

        points.push({
            id: `shuttle-${i}`,
            coords: [lat, lng],
            name: `Passenger ${i + 1}`,
            phone: '',
            pickup: schedule.starting_point
        })
    }
}

        
          if(schedule.route_point && schedule.route_point.length > 0 ){
            setPickupPoints(points)   
            console.log(pickupPoints)
          }
          else{
            console.log("giii")
          }

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
  const path = data.routes[0].geometry.coordinates.map((coord: any) => [
    coord[1],
    coord[0]
  ])



                        setRoutePath(path)
                       
}
                } catch (e: any) {
                    console.error("All route fetch attempts failed", e)
                    
                }
            }
            

            setLoading(false)
        }
        fetchData()
    }, [schedule])


    const fixRoutePoint = (data: any): any[] => {
  if (!data) return [];

  // ✅ Case 1: already correct array
  if (Array.isArray(data) && typeof data[0] === "object") {
    return data;
  }

  // ✅ Case 2: array of characters (YOUR CASE)
  if (Array.isArray(data) && typeof data[0] === "string") {
    try {
      const fixed = data.join(""); // 🔥 convert chars → string
      return JSON.parse(fixed);    // 🔥 string → JSON
    } catch (e) {
      console.error("Parse error", e);
      return [];
    }
  }

  // ✅ Case 3: string JSON
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Parse error", e);
      return [];
    }
  }

  return [];
};



    const wsRef = useRef<WebSocket | null>(null)

useEffect(() => {
    if (!schedule.driver_id) return;

    if (wsRef.current) return 

    const baseUrl = import.meta.env.VITE_BACKEND_URL

const WS_URL = baseUrl.replace('http', 'ws')

const ws = new WebSocket(`${WS_URL}/api/mobile/ws/driver/${schedule.driver_id}`)



    ws.onopen = () => {
        console.log("✅ Connected");
    };

    ws.onmessage = (event) => {
        console.log("🔥 data", event.data);

        const data = JSON.parse(event.data);

        console.log(data.route_point)

        if (data.type === "location_update") {
            // 🔥 THIS IS IMPORTANT
            setDriverLocation([data.latitude, data.longitude]);


        const routePoints = Array.isArray(data.route_point)
            ? data.route_point
            : data.route_point ? [data.route_point] : [];

                if (routePoints.length > 0) {
            routePoints.forEach((p: any) => {
            console.log("🟢 WS Pickup:", p.passenger_id, p.pickup);

            setPickedMap(prev => ({
        ...prev,
        [String(p.passenger_id).trim()]: {
            pickup: p.pickup === true,
            ispresent: p.ispresent === true,
             isdropped: p.isdropped === true  // ✅ Add this
        }
    }));
            });
            }
                       

        }
    };

     ws.onerror = (err) => {
        console.error("❌ WS error", err)
    }

    ws.onclose = () => {
        wsRef.current = null
    }



    return () => {
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
    }

}, [schedule.driver_id]);

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

const rawActiveLocation = driverLocation || startCoords || endCoords || null

  
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

                          {pickupPoints.map((p) => {

const data = pickedMap[String(p.id)];

let iconToUse: L.Icon | L.DivIcon = passengerIcon; // default

if (data) {
    if (data.isdropped) {
        iconToUse = droppedIcon; // dropped state
    } else if (data.pickup) {
        iconToUse = pickedPassengerIcon; // picked
    } else if (data.ispresent === false) {
        iconToUse = redPassengerIcon; // not present
    } else {
        iconToUse = passengerIcon; // present
    }
}

const statusText = data?.isdropped
    ? "Dropped 🟣"
    : data?.pickup
    ? "Picked ✅"
    : data?.ispresent === false
    ? "Not Present ❌"
    : "Present 👍";

  return (
    <Marker
      key={p.id}
      position={p.coords}
      icon={iconToUse}
    >
      <Popup>
        <div className="text-sm space-y-1">
          <div><strong>Name:</strong> {p.name}</div>
          <div><strong>Phone:</strong> {p.phone}</div>
          <div><strong>Pickup:</strong><br />{p.pickup}</div>
          <div>
  <strong>Status:</strong> {statusText}
</div>
        </div>
      </Popup>
    </Marker>
  )
})}

                            {startCoords && (
                                <Marker position={startCoords} icon={startIcon}>
                                    <Popup>
  <div className="text-sm">
    <strong>Start Point:</strong><br />
    {schedule.starting_point || 'No address'}
  </div>
</Popup>
                                </Marker>
                            )}

                            {endCoords && (
                                <Marker position={endCoords} icon={endIcon}>
                                    <Popup>
  <div className="text-sm">
    <strong>End Point:</strong><br />
    {schedule.end_point || 'No address'}
  </div>
</Popup>
                                </Marker>
                            )}

                            {/* Animated Car */}
                            {activeLocation && (
                                <Marker position={activeLocation} icon={carIcon} zIndexOffset={1000}>
                                    <Popup>Live Driver 🚕</Popup>
                                </Marker>
                            )}

                            {routePath.length > 0 ? (
                                <Polyline
  positions={routePath}
  color={"blue"}
  weight={5}
  opacity={0.7}
/>
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
