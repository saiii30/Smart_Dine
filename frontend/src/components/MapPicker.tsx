import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import { useAuth } from '../contexts/AuthContext'

import { useEffect, useState, useRef } from 'react'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

// Fix marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Props
interface Props {
  mode: 'starting_point' | 'end_point' | null
  startPoint?: { lat: number; lng: number }
  endPoint?: { lat: number; lng: number }

  // ✅ ADD THIS
  passengerPoint?: { lat: number; lng: number } | null

  onSelect: (lat: number, lng: number, distanceKm?: number, timeMin?: number) => void
}
// Helper: distance calc
const distanceInKm = (a: any, b: any) => {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// Click handler
const ClickHandler = ({ onClick }: any) => {
  const map = useMap()

  useEffect(() => {
    const handle = (e: any) => onClick(e.latlng)

    map.on('click', handle)

    return () => {
      map.off('click', handle)
    }
  }, [map, onClick])

  return null
}

interface RoutingProps {
  start: { lat: number; lng: number } | null
  end: { lat: number; lng: number } | null
  setDistance: (km: number) => void
  setTime: (min: number) => void
  setRouteLoading: (loading: boolean) => void
}

const SetupRouting = ({
  start,
  end,
  setDistance,
  setTime,
  setRouteLoading
}: RoutingProps) => {
  const map = useMap()
  const routingRef = useRef<any>(null)

  useEffect(() => {
    if (!map || !start || !end) return
    setRouteLoading(true)
    // 🔥 Remove old route safely
    if (routingRef.current) {
      try {
        routingRef.current.getPlan()?.setWaypoints([]) // clear
        map.removeControl(routingRef.current)
      } catch (e) {}
      routingRef.current = null
    }

    const control = (L as any).Routing.control({
  waypoints: [
    L.latLng(start.lat, start.lng),
    L.latLng(end.lat, end.lng)
  ],
  routeWhileDragging: false,
  addWaypoints: false,
  show: false,
  serviceUrl: 'https://router.project-osrm.org/route/v1',

  // 🔥 ADD HERE
  fitSelectedRoutes: true,
  showAlternatives: false,

  lineOptions: {
    styles: [
      {
        color: 'blue',   // 🔵 BLUE LINE
        weight: 6,       // thickness
        opacity: 0.8
      }
    ]
  }
}).addTo(map)

    routingRef.current = control

    control.on('routesfound', function (e: any) {
      const route = e.routes[0]
      if (route) {
        const km = route.summary.totalDistance / 1000
        const min = route.summary.totalTime / 60
        setDistance(km)
        setTime(min)
        setRouteLoading(false)
      }
    })

    return () => {
      if (routingRef.current) {
        try {
          routingRef.current.getPlan()?.setWaypoints([])
          map.removeControl(routingRef.current)
        } catch (e) {}
        routingRef.current = null
      }
    }
  }, [start, end, map])

  return null
}

// Main component
const MapPicker = ({
  mode,
  startPoint,
  endPoint,
  passengerPoint, // ✅ ADD
  onSelect
}: Props) => {

   const { user } = useAuth()   // ✅ INSIDE
  const isSupervisor = user?.role === 'SUPERVISOR'
  const [start, setStart] = useState(startPoint || null)
  const [end, setEnd] = useState(endPoint || null)
  const [distance, setDistance] = useState<number | null>(null)
  const [time, setTime] = useState<number | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{lat:number,lng:number} | null>(null)
const [routeLoading, setRouteLoading] = useState(false)
  const passengerIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png',
  iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})



  useEffect(() => {
    setStart(startPoint || null)
    setEnd(endPoint || null)
  }, [startPoint, endPoint])

  const handleClick = (latlng: any) => {

    if (isSupervisor) return

  // ✅ STARTING POINT CLICK
  if (mode === 'starting_point') {
    setStart(latlng)
    onSelect(latlng.lat, latlng.lng)
    setDistance(null)
    setTime(null)
    return
  }

  // ✅ END POINT CLICK
  if (mode === 'end_point') {
    setEnd(latlng)

    if (start) {
      const km = distanceInKm(start, latlng)
      const min = Math.ceil((km / 50) * 60)

      onSelect(latlng.lat, latlng.lng, km, time || min)

      alert(`Distance: ${km.toFixed(2)} km`)
      alert(`Estimated Time: ${min} min`)
    } else {
      alert('Please select a starting point first.')
      onSelect(latlng.lat, latlng.lng)
    }
    return
  }

  // ✅ PASSENGER PICKUP MODE (🔥 NEW)
  if (!mode) {
    // just allow click
    onSelect(latlng.lat, latlng.lng)
  }
}

useEffect(() => {


  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCurrentLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      })

   
    },
    (err) => {
      console.log("Location error:", err)

      setCurrentLocation({ lat: 11.6643, lng: 78.1460 }) // fallback

  
    }
  )
}, [])

const ChangeView = ({ center }: any) => {
  const map = useMap()

  useEffect(() => {
    if (center) {
      map.setView(center)
    }
  }, [center])

  return null
}

  return (
    <div>

      {routeLoading && (
  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/10 z-[999]">
    <div className="bg-white px-3 py-1 rounded shadow flex items-center gap-2">
      <div className="animate-spin h-4 w-4 border-b-2 border-blue-500 rounded-full"></div>
      <span className="text-xs">Calculating route...</span>
    </div>
  </div>
)}

      
      <MapContainer
        center={start || end || currentLocation || { lat: 11.6643, lng: 78.1460 }}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
      >

      <ChangeView center={start || end || currentLocation} />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {!isSupervisor && <ClickHandler onClick={handleClick} />}

        {start && <Marker position={start} />}
        {end && <Marker position={end} />}

       {passengerPoint && (
  <Marker position={passengerPoint} icon={passengerIcon} />
)}

       <SetupRouting
  start={start}
  end={end}
  setDistance={setDistance}
  setTime={setTime}
  setRouteLoading={setRouteLoading}   // ⭐ ADD THIS
/>
      </MapContainer>

      {start && end && distance !== null && time !== null && (
        <p className="mt-2 text-sm font-medium text-center">
          Distance: {distance.toFixed(2)} km | Estimated Time: {Math.ceil(time)} min
        </p>
      )}
    </div>
  )
}

export default MapPicker