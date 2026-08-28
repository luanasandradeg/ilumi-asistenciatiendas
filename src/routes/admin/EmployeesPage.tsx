import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import type { Profile, Store } from '../../types/database'

const emptyForm = { email: '', full_name: '', employee_code: '', store_id: '', role: 'employee' }

const ROLE_LABEL: Record<string, string> = {
  employee: 'Empleado',
  manager: 'Líder',
}

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
      supabase.from('profiles').select('*').in('role', ['employee', 'manager']).order('full_name'),
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
        role: isAdmin ? form.role : undefined,
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
        <h2 className="text-lg font-semibold text-brand-navy">Empleados</h2>
        {!creating && (
          <button
            onClick={() => {
              setCreating(true)
              setLastCreated(null)
            }}
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue"
          >
            Nuevo empleado
          </button>
        )}
      </div>

      {lastCreated && (
        <div className="mb-4 rounded-xl border border-brand-gold bg-brand-gold/10 p-4 text-sm text-brand-dark">
          Cuenta creada para <strong>{lastCreated.email}</strong>. Contraseña temporal:{' '}
          <strong>{lastCreated.temp_password}</strong> — compártela con el empleado, no se va a
          volver a mostrar.
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Nombre completo</label>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Código de empleado</label>
              <input
                value={form.employee_code}
                onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-dark">Local</label>
                <select
                  required
                  value={form.store_id}
                  onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                  className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
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
            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-dark">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
                >
                  <option value="employee">Empleado</option>
                  <option value="manager">Líder</option>
                </select>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm font-medium text-black">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue disabled:opacity-50"
            >
              {saving ? 'Creando…' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg bg-brand-dark/5 px-4 py-2 text-sm font-medium text-brand-dark"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-brand-dark/50">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-dark/10 text-left text-brand-dark/60">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Código</th>
                {isAdmin && <th className="px-4 py-3">Local</th>}
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-brand-dark/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-dark">{emp.full_name}</td>
                  <td className="px-4 py-3 text-brand-dark/70">{ROLE_LABEL[emp.role] ?? emp.role}</td>
                  <td className="px-4 py-3 text-brand-dark/70">{emp.employee_code ?? '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <select
                        value={emp.store_id ?? ''}
                        onChange={(e) => updateStore(emp, e.target.value)}
                        className="rounded-lg border border-brand-dark/20 px-2 py-1 text-sm"
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
                        emp.active ? 'bg-brand-gold/20 text-brand-navy' : 'bg-brand-dark/10 text-brand-dark/60'
                      }`}
                    >
                      {emp.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(isAdmin || emp.role === 'employee') && (
                      <button onClick={() => toggleActive(emp)} className="text-brand-blue">
                        {emp.active ? 'Desactivar' : 'Reactivar'}
                      </button>
                    )}
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
