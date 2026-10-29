export type DineRole = 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER'

export interface User {
  id: string
  email: string
  full_name: string
  role: DineRole | string
  branch_id?: number | null
  is_active: boolean
  created_at?: string
}

export interface DiningTable {
  id: number
  table_number: string
  capacity: number
  status: string
  zone?: string | null
  qr_token: string
  pos_x: number
  pos_y: number
  branch_id?: number | null
  qr_url?: string | null
  shape?: string
  width?: number
  height?: number
  is_merged?: boolean
  merge_history?: any
  waiter_id?: string | null
  waiter_name?: string | null
}

export interface Category {
  id: number
  name: string
  description?: string | null
}

export interface MenuItem {
  id: number
  name: string
  description?: string | null
  price: number
  category_id: number
  image_url?: string | null
  is_available: boolean
  is_veg: boolean
  category_name?: string | null
}

export interface OrderItem {
  id: number
  menu_item_id: number
  quantity: number
  unit_price: number
  status: string
  special_instructions?: string | null
  menu_item_name?: string | null
}

export interface Order {
  id: number
  table_id?: number | null
  table_name?: string | null
  waiter_id?: string | null
  branch_id?: number | null
  status: string
  seat_count?: number
  special_instructions?: string | null
  customer_name?: string | null
  subtotal: number
  tax_rate: number
  discount_amount: number
  total_amount: number
  created_at?: string
  updated_at?: string
  items: OrderItem[]
}

export interface DashboardStats {
  total_orders: number
  revenue: number
  active_tables: number
  pending_orders: number
  top_items: { name: string; qty: number }[]
}
