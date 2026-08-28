import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './routes/Login'
import EmployeeCheckIn from './routes/EmployeeCheckIn'
import AdminLayout from './routes/admin/AdminLayout'
import EmployeesPage from './routes/admin/EmployeesPage'
import StoresPage from './routes/admin/StoresPage'
import SchedulesPage from './routes/admin/SchedulesPage'
import AttendanceRecordsPage from './routes/admin/AttendanceRecordsPage'
import MyAttendancePage from './routes/admin/MyAttendancePage'

function Home() {
  const { profile } = useAuth()
  if (profile?.role === 'admin') {
    return <Navigate to="/admin/empleados" replace />
  }
  if (profile?.role === 'manager') {
    return <Navigate to="/admin/asistencia" replace />
  }
  return <EmployeeCheckIn />
}

function AdminIndex() {
  const { profile } = useAuth()
  return <Navigate to={profile?.role === 'manager' ? 'asistencia' : 'empleados'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminIndex />} />
              <Route path="asistencia" element={<MyAttendancePage />} />
              <Route path="empleados" element={<EmployeesPage />} />
              <Route path="horarios" element={<SchedulesPage />} />
              <Route path="registros" element={<AttendanceRecordsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/locales" element={<AdminLayout />}>
              <Route index element={<StoresPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
