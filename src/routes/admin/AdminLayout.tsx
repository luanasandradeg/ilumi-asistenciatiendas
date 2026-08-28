import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
    isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
  }`

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Panel de asistencia</h1>
            <p className="text-xs text-gray-500">
              {profile?.full_name} · {isAdmin ? 'Administrador' : 'Encargado de local'}
            </p>
          </div>
          <button onClick={() => signOut()} className="text-sm font-medium text-gray-500 underline">
            Salir
          </button>
        </div>
        <nav className="mx-auto mt-4 flex max-w-5xl gap-2 overflow-x-auto">
          <NavLink to="/admin/empleados" className={linkClass}>
            Empleados
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/locales" className={linkClass}>
              Locales
            </NavLink>
          )}
          <NavLink to="/admin/horarios" className={linkClass}>
            Horarios
          </NavLink>
          <NavLink to="/admin/registros" className={linkClass}>
            Registros
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
