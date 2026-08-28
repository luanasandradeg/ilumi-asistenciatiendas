import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { downloadCsv, parseCsv, toCsv } from '../../utils/csv'
import type { Store } from '../../types/database'

interface ResultRow {
  row: number
  full_name: string
  email: string
  status: 'created' | 'skipped' | 'error'
  message: string
  temp_password?: string
}

const TEMPLATE_HEADERS = ['nombre_completo', 'email', 'codigo_usuario', 'rol', 'local']
const TEMPLATE_EXAMPLE = [
  ['Juan Pérez', 'juan.perez@ejemplo.com', 'USR001', 'asesor', 'Sucursal Centro'],
  ['Maria Gomez', 'maria.gomez@ejemplo.com', 'USR002', 'lider', 'Sucursal Norte'],
]

function normalizeRole(raw: string): 'employee' | 'manager' | null {
  const v = raw.trim().toLowerCase()
  if (v === '' || v === 'asesor' || v === 'empleado') return 'employee'
  if (v === 'lider' || v === 'líder') return 'manager'
  return null
}

interface Props {
  stores: Store[]
  isAdmin: boolean
  onDone: () => void
}

export function BulkImportPanel({ stores, isAdmin, onDone }: Props) {
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState<ResultRow[] | null>(null)
  const [topError, setTopError] = useState<string | null>(null)

  function downloadTemplate() {
    downloadCsv('plantilla_usuarios.csv', toCsv(TEMPLATE_HEADERS, TEMPLATE_EXAMPLE))
  }

  async function handleFile(file: File) {
    setTopError(null)
    setResults(null)

    const text = await file.text()
    const table = parseCsv(text)
    if (table.length < 2) {
      setTopError('El archivo no tiene filas de datos.')
      return
    }

    const header = table[0].map((h) => h.trim().toLowerCase())
    const idx = {
      nombre: header.indexOf('nombre_completo'),
      email: header.indexOf('email'),
      codigo: header.indexOf('codigo_usuario') !== -1 ? header.indexOf('codigo_usuario') : header.indexOf('codigo_empleado'),
      rol: header.indexOf('rol'),
      local: header.indexOf('local'),
    }
    if (idx.nombre === -1 || idx.email === -1) {
      setTopError('Faltan columnas obligatorias: nombre_completo, email.')
      return
    }

    const dataRows = table.slice(1)
    setProcessing(true)
    setProgress({ done: 0, total: dataRows.length })
    const out: ResultRow[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const cols = dataRows[i]
      const full_name = (cols[idx.nombre] ?? '').trim()
      const email = (cols[idx.email] ?? '').trim().toLowerCase()
      const employee_code = idx.codigo !== -1 ? (cols[idx.codigo] ?? '').trim() || null : null
      const rolRaw = idx.rol !== -1 ? (cols[idx.rol] ?? '') : ''
      const localRaw = idx.local !== -1 ? (cols[idx.local] ?? '').trim() : ''
      const rowNum = i + 2

      if (!full_name || !email) {
        out.push({ row: rowNum, full_name, email, status: 'error', message: 'Falta nombre o email' })
        setProgress((p) => ({ ...p, done: p.done + 1 }))
        continue
      }

      const role = normalizeRole(rolRaw)
      if (role === null) {
        out.push({ row: rowNum, full_name, email, status: 'error', message: `Rol inválido: "${rolRaw}"` })
        setProgress((p) => ({ ...p, done: p.done + 1 }))
        continue
      }

      let store_id: string | undefined
      if (isAdmin) {
        if (!localRaw) {
          out.push({ row: rowNum, full_name, email, status: 'error', message: 'Falta el local' })
          setProgress((p) => ({ ...p, done: p.done + 1 }))
          continue
        }
        const match = stores.find((s) => s.name.trim().toLowerCase() === localRaw.toLowerCase())
        if (!match) {
          out.push({
            row: rowNum,
            full_name,
            email,
            status: 'error',
            message: `Local no encontrado: "${localRaw}"`,
          })
          setProgress((p) => ({ ...p, done: p.done + 1 }))
          continue
        }
        store_id = match.id
      }

      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: { email, full_name, employee_code, role, store_id },
      })

      if (error) {
        out.push({ row: rowNum, full_name, email, status: 'error', message: error.message })
      } else if (data?.error) {
        const isDup = /already|registrad/i.test(data.error)
        out.push({
          row: rowNum,
          full_name,
          email,
          status: isDup ? 'skipped' : 'error',
          message: isDup ? 'Ya existe una cuenta con ese email, no se modificó' : data.error,
        })
      } else {
        out.push({
          row: rowNum,
          full_name,
          email,
          status: 'created',
          message: 'Cuenta creada',
          temp_password: data.temp_password,
        })
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setProcessing(false)
    setResults(out)
    onDone()
  }

  function downloadResults() {
    if (!results) return
    const headers = ['Fila', 'Nombre', 'Email', 'Resultado', 'Detalle', 'Contraseña temporal']
    const rows = results.map((r) => [
      r.row,
      r.full_name,
      r.email,
      r.status === 'created' ? 'Creado' : r.status === 'skipped' ? 'Omitido (ya existía)' : 'Error',
      r.message,
      r.temp_password ?? '',
    ])
    downloadCsv(`resultado_carga_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))
  }

  const created = results?.filter((r) => r.status === 'created').length ?? 0
  const skipped = results?.filter((r) => r.status === 'skipped').length ?? 0
  const failed = results?.filter((r) => r.status === 'error').length ?? 0

  function close() {
    if (processing) return
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-lg bg-brand-navy/10 px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-navy/20"
      >
        Carga masiva de usuarios (asesores y líderes)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold text-brand-navy">Carga masiva de usuarios</h3>
              <button
                onClick={close}
                disabled={processing}
                className="rounded-lg bg-brand-dark/5 px-3 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/10 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <p className="mb-3 text-sm text-brand-dark/70">
              Subí un CSV con varias cuentas a la vez. Las filas cuyo email ya exista en el sistema se
              omiten — nunca se sobrescribe una cuenta existente.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={downloadTemplate}
                className="rounded-lg bg-brand-dark/5 px-3 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/10"
              >
                Descargar plantilla
              </button>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
                disabled={processing}
                className="text-sm text-brand-dark/70"
              />
            </div>

            {processing && (
              <p className="mt-3 text-sm text-brand-dark/60">
                Procesando {progress.done} de {progress.total}…
              </p>
            )}

            {topError && <p className="mt-3 text-sm font-medium text-black">{topError}</p>}

            {results && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-brand-dark">
                  {created} creados · {skipped} omitidos (ya existían) · {failed} con error
                </p>
                <button
                  onClick={downloadResults}
                  className="mb-3 rounded-lg bg-brand-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue"
                >
                  Descargar resultado (incluye contraseñas)
                </button>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-brand-dark/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-brand-dark/10 bg-brand-dark/5 text-left text-brand-dark/60">
                        <th className="px-3 py-2">Fila</th>
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.row} className="border-b border-brand-dark/5 last:border-0">
                          <td className="px-3 py-2">{r.row}</td>
                          <td className="px-3 py-2">{r.full_name}</td>
                          <td className="px-3 py-2">{r.email}</td>
                          <td className="px-3 py-2">
                            {r.status === 'created' && <span className="text-brand-navy">Creado</span>}
                            {r.status === 'skipped' && <span className="text-brand-blue">Omitido</span>}
                            {r.status === 'error' && <span className="text-black">{r.message}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
