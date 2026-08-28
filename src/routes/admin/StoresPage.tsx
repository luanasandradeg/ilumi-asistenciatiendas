import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentPosition } from '../../utils/geo'
import type { Store } from '../../types/database'

const emptyForm = {
  id: '',
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radius_meters: '50',
  timezone: 'America/Santiago',
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('stores').select('*').order('name')
    if (!error && data) setStores(data as Store[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function startCreate() {
    setForm(emptyForm)
    setEditing(true)
    setError(null)
  }

  function startEdit(s: Store) {
    setForm({
      id: s.id,
      name: s.name,
      address: s.address ?? '',
      latitude: String(s.latitude),
      longitude: String(s.longitude),
      radius_meters: String(s.radius_meters),
      timezone: s.timezone,
    })
    setEditing(true)
    setError(null)
  }

  async function useMyLocation() {
    setLocating(true)
    try {
      const pos = await getCurrentPosition()
      setForm((f) => ({ ...f, latitude: String(pos.latitude), longitude: String(pos.longitude) }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLocating(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters),
      timezone: form.timezone.trim() || 'America/Santiago',
    }

    const { error } = form.id
      ? await supabase.from('stores').update(payload).eq('id', form.id)
      : await supabase.from('stores').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setEditing(false)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-navy">Locales</h2>
        {!editing && (
          <button
            onClick={startCreate}
            className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue"
          >
            Nuevo local
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Nombre</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Dirección</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Latitud</label>
              <input
                required
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Longitud</label>
              <input
                required
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Radio permitido (m)</label>
              <input
                required
                type="number"
                min="1"
                value={form.radius_meters}
                onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Zona horaria</label>
              <input
                required
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="America/Santiago"
                className="w-full rounded-lg border border-brand-dark/20 px-3 py-2 focus:border-brand-navy focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-3 text-sm font-medium text-brand-blue disabled:opacity-50"
          >
            {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
          </button>

          {error && <p className="mt-3 text-sm font-medium text-black">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
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
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Radio</th>
                <th className="px-4 py-3">Zona horaria</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-b border-brand-dark/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-dark">{s.name}</td>
                  <td className="px-4 py-3 text-brand-dark/70">{s.address ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-dark/70">{s.radius_meters} m</td>
                  <td className="px-4 py-3 text-brand-dark/70">{s.timezone}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(s)} className="text-brand-blue">
                      Editar
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
