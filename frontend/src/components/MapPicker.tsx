import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import { useEffect, useState } from 'react'
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
  onSelect: (lat: number, lng: number, distanceKm?: number, timeMin?: number) => void
}
 
// Helper: calculate distance in km (Haversine formula)
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
 
// Handle map clicks
const ClickHandler = ({ onClick }: any) => {
  const map = useMap()
  useEffect(() => {
    map.on('click', (e: any) => {
      onClick(e.latlng)
    })
    return () => {
      map.off('click')
    }
  }, [map, onClick])
  return null
}
 
// Routing setup
const SetupRouting = ({
  start,
  end,
  setDistance,
  setTime,
}: {
  start: { lat: number; lng: number } | null
  end: { lat: number; lng: number } | null
  setDistance: (km: number) => void
  setTime: (minutes: number) => void
}) => {
  const map = useMap()
 
  useEffect(() => {
    if (!start || !end) return
 
    const control = L.Routing.control({
      waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
      routeWhileDragging: true,
      show: false,
      addWaypoints: false,
      lineOptions: { styles: [{ color: 'blue', weight: 5, opacity: 0.7 }], extendToWaypoints: true, missingRouteTolerance: 2 }
    }).addTo(map)
 
    // Listen for route calculation
    control.on('routesfound', function (e: any) {
      const route = e.routes[0]
      if (route) {
        const km = route.summary.totalDistance / 1000
        const minutes = route.summary.totalTime / 60
        setDistance(km)
        setTime(minutes)
      }
    })
 
    return () => {
      map.removeControl(control)
    }
  }, [start, end, map, setDistance, setTime])
 
  return null
}
 
// Main component
const MapPicker = ({ mode, startPoint, endPoint, onSelect }: Props) => {
  const [start, setStart] = useState(startPoint || null)
  const [end, setEnd] = useState(endPoint || null)
  const [distance, setDistance] = useState<number | null>(null)
  const [time, setTime] = useState<number | null>(null)
 
  useEffect(() => {
    setStart(startPoint || null)
   
    setEnd(endPoint || null)
  }, [startPoint, endPoint])
 
  const handleClick = (latlng: any) => {
    if (mode === 'starting_point') {
      setStart(latlng)
      onSelect(latlng.lat, latlng.lng)
      setDistance(null)
      setTime(null)
    } else if (mode === 'end_point') {
      setEnd(latlng)
      if (start) {
        onSelect(latlng.lat, latlng.lng, distanceInKm(start, latlng))
      } else {
        onSelect(latlng.lat, latlng.lng)
      }
    }
  }
 
  return (
    <div>
      <MapContainer
        center={start || { lat: 11.0168, lng: 76.9558 }}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onClick={handleClick} />
        {start && <Marker position={start} />}
        {end && <Marker position={end} />}
        <SetupRouting
          start={start}
          end={end}
          setDistance={setDistance}
          setTime={setTime}
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
 
 