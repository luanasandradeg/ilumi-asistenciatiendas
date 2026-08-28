import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError('Email o contraseña incorrectos.')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-navy/5 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-semibold text-brand-navy">Asistencia</h1>
        <p className="mb-6 text-sm text-brand-dark/60">Ingresa con tu cuenta para marcar asistencia.</p>

        <label className="mb-1 block text-sm font-medium text-brand-dark">Email</label>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-brand-dark/20 px-3 py-2 text-base focus:border-brand-navy focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-brand-dark">Contraseña</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-brand-dark/20 px-3 py-2 text-base focus:border-brand-navy focus:outline-none"
        />

        {error && <p className="mb-4 text-sm font-medium text-black">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-navy py-3 text-base font-medium text-white hover:bg-brand-blue disabled:opacity-50"
        >
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
