export interface User {
  id: string
  email: string
  full_name: string
  company_name?: string
  role: string
  is_active: boolean
  agency_status?: string
  created_at: string
}

export type VehicleType = 'Sedan' | 'SUV' | 'Van' | 'Bus' | 'Mini_Bus' | 'Hatchback'

export interface Vehicle {
  id: string
  user_id: string
  vehicle_type: string
  vehicle_brand: string
  vehicle_model: string
  vehicle_number : string
  make: string
  model: string
  manufacturing_year: number
  color?: string
  vehicle_registration_number: string
  rc_number?: string
  seating_capacity: number
  fuel_type: string
  gps_device_id?: string
  vehicle_status: string
  is_active: boolean
  assigned_driver_id?: string

  insurance_number?: string
  insurance_date?: string
  insurance_expiry?: string
  insurance_copy?: string

  registration_date?: string
  registration_expiry?: string
  registration_certificate?: string

  pollution_certificate?: string

  fire_extinguisher_available: boolean
  first_aid_kit_available: boolean
  emergency_support_number?: string

  policy_certificate?: string

  notes?: string
  service_expiry?: string
  puc_expiry?: string
  insurance_renewal_date?: string
  category?: string
  owner_name?: string
  ownership_type?: string

  created_at?: string
  updated_at?: string
}

export interface Driver {
  id: string
  user_id: string
  user: {
    name: string
    email?: string
    contact_number?: string
  }
  email?: string

  date_of_birth?: string
  gender?: string
  blood_group?: string

  aadhar_number?: string
  driving_license_number: string
  license_expiry_date: string

  aadhar_document?: string
  driver_photo?: string
  police_verification_certificate?: string
  medical_fitness_certificate?: string

  verification_status?: string
  status?: string
  is_active: boolean

  current_address?: string
  city?: string
  state?: string
  pincode?: string

  emergency_contact_name?: string
  emergency_contact_number?: string

  previous_employer_experience?: string
  languages_spoken?: string
  shift_preference?: string
  assigned_vehicle_id?: string

  notes?: string
  created_at: string
  updated_at?: string
}

export interface Company {
  id: string
  agency_id: string
  name: string
  address?: string
  service_start_date: string
  service_end_date: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at?: string
  company_name?: string
}

export interface TripSchedule {
  id: string
  trip_id: string
  
  vehicle_id?: string
  driver_id?: string
  passenger_count: number
  notes?: string
  created_at: string
  updated_at?: string
  vehicle_number?: string

  start_date?: string
  end_date?: string
  starting_point?: string
  starting_lat ?: number
  starting_lng ?: number
  end_point?: string
  end_lat ?: number
  end_lng ?: number

  // end_time?: string
  one_way_start_time?: string
  two_way_start_time?: string
  one_way_isActive?: boolean
  two_way_isActive?: boolean
  way?: string
  trip_type?: string
  distance_km?: number
  driver_name?: string
  time_min?: number
  duration_min?: number

  vehicle_registration_number?: string
  is_active: boolean
  route_point?: RoutePoint[] 
  
}

export interface Schedule {
    id: string | number
    trip_id: string | number

    company_name: string

    vehicle_registration_number: string

    driver_name: string

    starting_point: string
    end_point: string

    start_date: string
    start_time: string

    passenger_count: number

    trip_type: string

    route_point: any[]  // (can refine later if backend shape is known)

    status: 'Active' | 'Inactive'

    driver_id: string | number

    driver_phone: string
}

export interface RoutePoint {
  name: string
  phone: string
  pickup_point: string
  pickup_lat?: number
  pickup_lng?: number
  timestamp: string
  ispresent: boolean
  isdropped: boolean
  dropoff:boolean
}

export interface Trip {
  id: string
  user_id: string
  company_id: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  company_name?: string
  agency_id?: string
  company_branch?: string
  passenger_count?: number
  schedules: TripSchedule[]
}
