import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { GeoStatusBadge } from './GeoStatusBadge'
import { getCurrentPosition, haversineDistanceMeters } from '../utils/geo'
import type { AttendanceRecord, AttendanceType } from '../types/database'

type GeoStatus = 'idle' | 'locating' | 'in_range' | 'out_of_range' | 'error'

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

export function CheckInPanel() {
  const { profile } = useAuth()
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [distance, setDistance] = useState<number | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [marking, setMarking] = useState<AttendanceType | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)

  const store = profile?.store ?? null

  const loadRecords = useCallback(async () => {
    if (!profile) return
    setLoadingRecords(true)
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', profile.id)
      .order('marked_at', { ascending: false })
      .limit(10)
    if (!error && data) setRecords(data as AttendanceRecord[])
    setLoadingRecords(false)
  }, [profile])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const locate = useCallback(async () => {
    if (!store) return
    setGeoStatus('locating')
    setErrorMsg(null)
    try {
      const pos = await getCurrentPosition()
      const d = haversineDistanceMeters(
        pos.latitude,
        pos.longitude,
        store.latitude,
        store.longitude,
      )
      setDistance(d)
      setCoords({ lat: pos.latitude, lng: pos.longitude })
      setGeoStatus(d <= store.radius_meters ? 'in_range' : 'out_of_range')
    } catch (err) {
      setGeoStatus('error')
      setErrorMsg(
        err instanceof GeolocationPositionError
          ? 'Activa el permiso de ubicación para marcar asistencia.'
          : (err as Error).message,
      )
    }
  }, [store])

  useEffect(() => {
    locate()
  }, [locate])

  async function handleMark(type: AttendanceType) {
    if (!coords) return
    setMarking(type)
    setErrorMsg(null)
    const { error } = await supabase.rpc('mark_attendance', {
      p_type: type,
      p_lat: coords.lat,
      p_lng: coords.lng,
    })
    setMarking(null)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    await loadRecords()
    await locate()
  }

  if (!profile) return null

  if (!store) {
    return (
      <div className="px-4 py-10 text-center text-brand-dark/70">
        Tu cuenta todavía no tiene un local asignado. Contacta al admin.
      </div>
    )
  }

  return (
    <div>
      <GeoStatusBadge
        status={geoStatus}
        distanceMeters={distance}
        radiusMeters={store.radius_meters}
        message={errorMsg ?? undefined}
      />

      <button
        onClick={locate}
        className="mt-2 w-full text-center text-xs font-medium text-brand-blue"
      >
        Actualizar ubicación
      </button>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => handleMark('entrada')}
          disabled={geoStatus !== 'in_range' || marking !== null}
          className="rounded-2xl bg-brand-navy py-5 text-base font-semibold text-white disabled:opacity-40"
        >
          {marking === 'entrada' ? 'Marcando…' : 'Marcar entrada'}
        </button>
        <button
          onClick={() => handleMark('salida')}
          disabled={geoStatus !== 'in_range' || marking !== null}
          className="rounded-2xl bg-black py-5 text-base font-semibold text-white disabled:opacity-40"
        >
          {marking === 'salida' ? 'Marcando…' : 'Marcar salida'}
        </button>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-brand-dark">Últimas marcas</h2>
      {loadingRecords ? (
        <p className="text-sm text-brand-dark/50">Cargando…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-brand-dark/50">Todavía no marcaste asistencia.</p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium capitalize text-brand-dark">{r.type}</p>
                <p className="text-xs text-brand-dark/60">
                  {new Date(r.marked_at).toLocaleString('es', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-brand-dark/80">
                  {r.status ? STATUS_LABEL[r.status] : '—'}
                </p>
                <p className="text-xs text-brand-dark/50">{formatVariance(r.variance_minutes)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
