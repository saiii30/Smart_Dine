export interface User {
  id: number
  email: string
  full_name: string
  company_name?: string
  role: string
  is_active: boolean
  created_at: string
}
 
export type VehicleType = 'Sedan' | 'SUV' | 'Van' | 'Bus' | 'Mini_Bus' | 'Hatchback'
 
export interface Vehicle {
  id: number
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
  full_name: string
  phone_number: string
  email?: string
<<<<<<< HEAD
 
=======
  password?: string

>>>>>>> aa3d586a984ad24c299fe4f926b0252b6090443f
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
  assigned_vehicle_id?: number
 
  notes?: string
  created_at: string
  updated_at?: string
}
 
export interface Company {
  id: number
  agency_id: string
  name: string
  address?: string
  service_start_date: string
  service_end_date: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at?: string
}
 
export interface TripSchedule {
  id: number
  trip_id: number
 
  vehicle_id?: number
  driver_id?: string
  passenger_count: number
  notes?: string
  created_at: string
  updated_at?: string
  vehicle_number?: string
  driver_name?: string
  start_date?: string
  end_date?: string
  starting_point?: string
  starting_lat ?: number
  starting_lng ?: number
  end_point?: string
  end_lat ?: number
  end_lng ?: number
  start_time?: string
  end_time?: string
  way?: string
  trip_type?: string
  distance_km?: number
 
  time_min?: number
  duration_min?: number
 
  vehicle_registration_number?: string
  is_active: boolean
  route_points?: RoutePoint[]
 
}
 
export interface RoutePoint {
  name: string
  phone: string
  address: string
  start_point: string
  start_lat: number
  start_lng: number
  end_point: string
  end_lat: number
  end_lng: number
}
 
export interface Trip {
  id: number
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
 
 