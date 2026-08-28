import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Profile, Schedule } from '../../types/database'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface DayRow {
  id: string | null
  works: boolean
  start: string
  end: string
}

function emptyDays(): DayRow[] {
  return Array.from({ length: 7 }, () => ({ id: null, works: false, start: '09:00', end: '18:00' }))
}

export default function SchedulesPage() {
  const [employees, setEmployees] = useState<Profile[]>([])
  const [selected, setSelected] = useState('')
  const [days, setDays] = useState<DayRow[]>(emptyDays())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, role, store_id, employee_code, active, created_at')
      .in('role', ['employee', 'manager'])
      .order('full_name')
      .then(({ data }) => {
        if (data) setEmployees(data as Profile[])
      })
  }, [])

  useEffect(() => {
    if (!selected) {
      setDays(emptyDays())
      return
    }
    setLoading(true)
    supabase
      .from('schedules')
      .select('*')
      .eq('employee_id', selected)
      .is('effective_to', null)
      .then(({ data }) => {
        const next = emptyDays()
        for (const row of (data as Schedule[]) ?? []) {
          next[row.day_of_week] = {
            id: row.id,
            works: true,
            start: row.expected_start.slice(0, 5),
            end: row.expected_end.slice(0, 5),
          }
        }
        setDays(next)
        setLoading(false)
      })
  }, [selected])

  function updateDay(i: number, patch: Partial<DayRow>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setMessage(null)

    for (let i = 0; i < 7; i++) {
      const d = days[i]
      if (d.works) {
        const payload = {
          employee_id: selected,
          day_of_week: i,
          expected_start: d.start,
          expected_end: d.end,
        }
        if (d.id) {
          await supabase.from('schedules').update(payload).eq('id', d.id)
        } else {
          await supabase.from('schedules').insert(payload)
        }
      } else if (d.id) {
        await supabase.from('schedules').delete().eq('id', d.id)
      }
    }

    setSaving(false)
    setMessage('Horario guardado.')
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-brand-navy">Horarios</h2>

      <div className="mb-4 max-w-xs">
        <label className="mb-1 block text-sm font-medium text-brand-dark">Empleado</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
        >
          <option value="">Seleccionar…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
      </div>

      {selected && !loading && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="space-y-2">
            {DAYS.map((label, i) => (
              <div key={label} className="flex flex-wrap items-center gap-3 border-b border-brand-dark/5 py-2 last:border-0">
                <label className="flex w-36 items-center gap-2 text-sm font-medium text-brand-dark">
                  <input
                    type="checkbox"
                    checked={days[i].works}
                    onChange={(e) => updateDay(i, { works: e.target.checked })}
                  />
                  {label}
                </label>
                <input
                  type="time"
                  disabled={!days[i].works}
                  value={days[i].start}
                  onChange={(e) => updateDay(i, { start: e.target.value })}
                  className="rounded-lg border border-brand-dark/20 px-2 py-1 text-sm disabled:opacity-40"
                />
                <span className="text-brand-dark/50">a</span>
                <input
                  type="time"
                  disabled={!days[i].works}
                  value={days[i].end}
                  onChange={(e) => updateDay(i, { end: e.target.value })}
                  className="rounded-lg border border-brand-dark/20 px-2 py-1 text-sm disabled:opacity-40"
                />
              </div>
            ))}
          </div>

          {message && <p className="mt-3 text-sm font-medium text-brand-navy">{message}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar horario'}
          </button>
        </div>
      )}
    </div>
  )
}
