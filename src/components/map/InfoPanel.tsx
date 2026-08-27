import { localName, useI18n } from '../../i18n'
import type { Station, TransitData, VehiclePosition } from '../../types'

interface Props {
  data: TransitData | null
  vehicle: VehiclePosition | null
}

export function InfoPanel({ data, vehicle }: Props) {
  const { lang, t } = useI18n()
  const stationById = new Map((data?.stations ?? []).map(station => [station.id, station] as const))
  const line = data?.railLines.find(item => item.id === vehicle?.lineId)
  const nextStop: Station | undefined = vehicle?.nextStopId ? stationById.get(vehicle.nextStopId) : undefined
  const destination: Station | undefined = vehicle?.destinationId ? stationById.get(vehicle.destinationId) : undefined

  return (
    <section className="info-panel">
      <h2>{vehicle ? t.selectedVehicle : t.noSelection}</h2>
      {vehicle && line && (
        <div className="info-grid">
          <span className="line-chip" style={{ borderColor: line.color, color: line.color }}>
            {localName(line, lang)}
          </span>
          <p>{t.destination}: <strong>{localName(destination, lang)}</strong></p>
          <p>{t.nextStop}: <strong>{localName(nextStop, lang)}</strong></p>
          <p>Progress: <strong>{Math.round(vehicle.progress * 100)}%</strong></p>
        </div>
      )}
    </section>
  )
}
