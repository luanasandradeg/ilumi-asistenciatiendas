import { useAuth } from '../contexts/AuthContext'
import { CheckInPanel } from '../components/CheckInPanel'

export default function EmployeeCheckIn() {
  const { profile, signOut } = useAuth()

  if (!profile) return null

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-brand-navy/5 px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-dark/60">Hola,</p>
          <h1 className="text-lg font-semibold text-brand-navy">{profile.full_name}</h1>
          <p className="text-xs text-brand-dark/50">{profile.store?.name ?? ''}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-lg bg-brand-dark/5 px-3 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/10"
        >
          Cerrar sesión
        </button>
      </div>

      <CheckInPanel />
    </div>
  )
}
