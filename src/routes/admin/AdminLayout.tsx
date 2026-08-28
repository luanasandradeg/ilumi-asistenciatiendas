import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
    isActive ? 'bg-brand-navy text-white' : 'bg-brand-dark/5 text-brand-dark/70'
  }`

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-dvh bg-brand-navy/5">
      <header className="border-b border-brand-dark/10 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">Panel de asistencia</h1>
            <p className="text-xs text-brand-dark/60">
              {profile?.full_name} · {isAdmin ? 'Administrador' : 'Líder'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-lg bg-brand-dark/5 px-3 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/10"
          >
            Cerrar sesión
          </button>
        </div>
        <nav className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto">
          {!isAdmin && (
            <NavLink to="/admin/asistencia" className={linkClass}>
              Marcar asistencia
            </NavLink>
          )}
          <NavLink to="/admin/empleados" className={linkClass}>
            Usuarios
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
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
