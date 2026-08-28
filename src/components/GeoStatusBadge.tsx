interface Props {
  status: 'idle' | 'locating' | 'in_range' | 'out_of_range' | 'error'
  distanceMeters?: number | null
  radiusMeters?: number
  message?: string
}

const STYLES: Record<Props['status'], string> = {
  idle: 'bg-gray-100 text-gray-600',
  locating: 'bg-blue-100 text-blue-700',
  in_range: 'bg-green-100 text-green-700',
  out_of_range: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
}

const LABELS: Record<Props['status'], string> = {
  idle: 'Ubicación no verificada',
  locating: 'Obteniendo ubicación…',
  in_range: 'Dentro del local',
  out_of_range: 'Fuera de rango',
  error: 'No se pudo obtener la ubicación',
}

export function GeoStatusBadge({ status, distanceMeters, radiusMeters, message }: Props) {
  return (
    <div className={`rounded-xl px-4 py-3 text-center text-sm font-medium ${STYLES[status]}`}>
      <div>{LABELS[status]}</div>
      {distanceMeters != null && radiusMeters != null && (
        <div className="mt-1 text-xs opacity-80">
          Estás a {Math.round(distanceMeters)} m del local (máximo permitido {radiusMeters} m)
        </div>
      )}
      {message && <div className="mt-1 text-xs opacity-80">{message}</div>}
    </div>
  )
}
