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
  owner_id: number
  vehicle_number: string
  vehicle_type: VehicleType
  make: string
  model: string
  year: number
  color?: string
  seating_capacity: number
  registration_number: string
  insurance_number?: string
  insurance_expiry?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at?: string
}

export interface Driver {
  id: number
  owner_id: number
  full_name: string
  email?: string
  phone: string
  license_number: string
  license_expiry: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at?: string
}

export interface Company {
  id: number
  owner_id: number
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
  destination: string
  departure_datetime: string
  vehicle_id?: number
  driver_id?: number
  passenger_count: number
  notes?: string
  created_at: string
  updated_at?: string
  vehicle_number?: string
  driver_name?: string
}

export interface Trip {
  id: number
  owner_id: number
  company_id: number
  trip_code: string
  name: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  company_name?: string
  schedules: TripSchedule[]
}

