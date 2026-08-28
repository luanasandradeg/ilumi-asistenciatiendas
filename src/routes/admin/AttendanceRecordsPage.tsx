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
      .eq('role', 'employee')
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
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Registros de asistencia</h2>

      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Empleado</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
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
            <label className="mb-1 block text-xs font-medium text-gray-500">Local</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
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
          <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
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
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.profile?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.store?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{r.type}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(r.marked_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.expected_time?.slice(0, 5) ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatVariance(r.variance_minutes)}</td>
                  <td className="px-4 py-3">
                    {r.status ? (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          r.status === 'on_time'
                            ? 'bg-green-100 text-green-700'
                            : r.status === 'late'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">sin horario</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
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
