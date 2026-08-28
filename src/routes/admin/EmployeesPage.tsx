import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import type { Profile, Store } from '../../types/database'

const emptyForm = { email: '', full_name: '', employee_code: '', store_id: '' }

export default function EmployeesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [employees, setEmployees] = useState<Profile[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCreated, setLastCreated] = useState<{ email: string; temp_password: string } | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: sts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'employee').order('full_name'),
      supabase.from('stores').select('*').order('name'),
    ])
    if (emps) setEmployees(emps as Profile[])
    if (sts) setStores(sts as Store[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    setLastCreated(null)

    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        employee_code: form.employee_code.trim() || null,
        store_id: isAdmin ? form.store_id : undefined,
      },
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data?.error) {
      setError(data.error)
      return
    }

    setLastCreated({ email: data.email, temp_password: data.temp_password })
    setForm(emptyForm)
    setCreating(false)
    load()
  }

  async function toggleActive(emp: Profile) {
    await supabase.from('profiles').update({ active: !emp.active }).eq('id', emp.id)
    load()
  }

  async function updateStore(emp: Profile, store_id: string) {
    await supabase.from('profiles').update({ store_id }).eq('id', emp.id)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Empleados</h2>
        {!creating && (
          <button
            onClick={() => {
              setCreating(true)
              setLastCreated(null)
            }}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Nuevo empleado
          </button>
        )}
      </div>

      {lastCreated && (
        <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">
          Cuenta creada para <strong>{lastCreated.email}</strong>. Contraseña temporal:{' '}
          <strong>{lastCreated.temp_password}</strong> — compártela con el empleado, no se va a
          volver a mostrar.
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo</label>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Código de empleado</label>
              <input
                value={form.employee_code}
                onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Local</label>
                <select
                  required
                  value={form.store_id}
                  onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Seleccionar…</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Creando…' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                {isAdmin && <th className="px-4 py-3">Local</th>}
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.employee_code ?? '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <select
                        value={emp.store_id ?? ''}
                        onChange={(e) => updateStore(emp, e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      >
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {emp.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleActive(emp)} className="text-blue-600">
                      {emp.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
