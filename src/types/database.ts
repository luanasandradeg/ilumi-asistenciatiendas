export type Role = 'admin' | 'manager' | 'employee'

export type AttendanceType = 'entrada' | 'salida'

export type AttendanceStatus = 'on_time' | 'late' | 'early'

export interface Store {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  radius_meters: number
  timezone: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: Role
  store_id: string | null
  employee_code: string | null
  active: boolean
  created_at: string
}

export interface Schedule {
  id: string
  employee_id: string
  day_of_week: number // 0 = domingo ... 6 = sábado
  expected_start: string // 'HH:MM:SS'
  expected_end: string // 'HH:MM:SS'
  effective_from: string // date
  effective_to: string | null // date
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  store_id: string
  type: AttendanceType
  marked_at: string
  latitude: number
  longitude: number
  distance_meters: number
  expected_time: string | null
  variance_minutes: number | null
  status: AttendanceStatus | null
}

export interface ProfileWithStore extends Profile {
  store: Store | null
}
