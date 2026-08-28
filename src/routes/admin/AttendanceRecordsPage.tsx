import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import type { Profile, Store } from '../../types/database'

interface Row {
  id: string
  type: string
  marked_at: string
  expected_time: string | null
  variance_minutes: number | null
  status: string | null
  distance_meters: number
  profile: { full_name: string } | null
  store: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  on_time: 'A horario',
  late: 'Tarde',
  early: 'Temprano',
}

function formatVariance(minutes: number | null) {
  if (minutes == null) return '—'
  const abs = Math.abs(Math.round(minutes))
  if (abs === 0) return 'justo a horario'
  return minutes > 0 ? `${abs} min tarde` : `${abs} min antes`
}

export default function AttendanceRecordsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [employees, setEmployees] = useState<Profile[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .in('role', ['employee', 'manager'])
      .order('full_name')
      .then(({ data }) => data && setEmployees(data as Profile[]))
    supabase
      .from('stores')
      .select('*')
      .order('name')
      .then(({ data }) => data && setStores(data as Store[]))
  }, [])

  async function load() {
    setLoading(true)
    let query = supabase
      .from('attendance_records')
      .select('*, profile:profiles(full_name), store:stores(name)')
      .order('marked_at', { ascending: false })
      .limit(200)

    if (employeeId) query = query.eq('employee_id', employeeId)
    if (isAdmin && storeId) query = query.eq('store_id', storeId)
    if (from) query = query.gte('marked_at', `${from}T00:00:00`)
    if (to) query = query.lte('marked_at', `${to}T23:59:59`)

    const { data, error } = await query
    if (!error && data) setRows(data as unknown as Row[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, storeId, from, to])

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-brand-navy">Registros de asistencia</h2>

      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-dark/60">Empleado</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded-lg border border-brand-dark/20 px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
          >
            <option value="">Todos</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-dark/60">Local</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="rounded-lg border border-brand-dark/20 px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
            >
              <option value="">Todos</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-dark/60">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-brand-dark/20 px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-dark/60">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-brand-dark/20 px-2 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-brand-dark/50">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-dark/10 text-left text-brand-dark/60">
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marcado</th>
                <th className="px-4 py-3">Esperado</th>
                <th className="px-4 py-3">Variación</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-brand-dark/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-dark">{r.profile?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-dark/70">{r.store?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-brand-dark/70">{r.type}</td>
                  <td className="px-4 py-3 text-brand-dark/70">
                    {new Date(r.marked_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-brand-dark/70">{r.expected_time?.slice(0, 5) ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-dark/70">{formatVariance(r.variance_minutes)}</td>
                  <td className="px-4 py-3">
                    {r.status ? (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          r.status === 'on_time'
                            ? 'bg-brand-gold/20 text-brand-navy'
                            : r.status === 'late'
                              ? 'bg-black text-white'
                              : 'bg-brand-blue/15 text-brand-blue'
                        }`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    ) : (
                      <span className="text-xs text-brand-dark/40">sin horario</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-brand-dark/40">
                    No hay registros para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
