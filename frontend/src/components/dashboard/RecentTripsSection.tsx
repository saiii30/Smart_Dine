import { useNavigate } from 'react-router-dom'
import { TripSchedule } from '../../types'

// Constants
const RECENT_TRIPS_LIMIT = 4

interface RecentTripsSectionProps {
  recentTrips: TripSchedule[]
}

const RecentTripsSection = ({ recentTrips }: RecentTripsSectionProps) => {
  const navigate = useNavigate()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Trips</h2>
        <button 
          onClick={() => navigate('/trips')}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
        >
          View All
        </button>
      </div>
      <div className="space-y-3">
        {recentTrips.slice(0, RECENT_TRIPS_LIMIT).map((trip) => (
          <div key={trip.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  TR-{trip.id}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {trip.starting_point} -&gt; {trip.end_point}
                </p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                trip.is_active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {trip.is_active ? 'In Progress' : 'Completed'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentTripsSection
