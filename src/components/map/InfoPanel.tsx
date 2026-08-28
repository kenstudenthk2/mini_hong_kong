import { localName, useI18n } from '../../i18n'
import type { AirportFlight, FerryRoute, Lang, Station, TransitData, VehiclePosition } from '../../types'

interface Props {
  data: TransitData | null
  vehicle: VehiclePosition | null
}

export function flightForVehicle(data: TransitData | null, vehicle: VehiclePosition | null): AirportFlight | undefined {
  if (!data || vehicle?.type !== 'flight') return undefined
  return data.flights?.find(flight => flight.id === vehicle.tripId)
}

function localizedFlightValue(values: Partial<Record<'en' | 'zh_HK' | 'zh_CN', string>>, lang: Lang, fallback: string | null): string {
  const keys = lang === 'zh' ? ['zh_HK', 'zh_CN', 'en'] : ['en', 'zh_HK', 'zh_CN']
  return keys.map(key => values[key as keyof typeof values]).find(Boolean) ?? fallback ?? '-'
}

function flightLabel(lang: Lang, key: 'flight' | 'airline' | 'route' | 'scheduled' | 'status' | 'progress' | 'cargo'): string {
  const labels = {
    en: { flight: 'Flight', airline: 'Airline', route: 'Route', scheduled: 'Scheduled', status: 'Status', progress: 'Progress', cargo: 'Cargo' },
    zh: { flight: '航班', airline: '航空公司', route: '航線', scheduled: '預定時間', status: '狀態', progress: '進度', cargo: '貨運' },
    pt: { flight: 'Voo', airline: 'Companhia', route: 'Rota', scheduled: 'Agendado', status: 'Estado', progress: 'Progresso', cargo: 'Carga' },
  } as const
  return labels[lang][key]
}

export function routeForVehicle(data: TransitData | null, vehicle: VehiclePosition | null): FerryRoute | undefined {
  if (!data || (vehicle?.type !== 'ferry' && vehicle?.type !== 'tram')) return undefined
  const routes = vehicle.type === 'ferry' ? data.ferryRoutes : data.tramRoutes
  return routes?.find(route => route.id === vehicle.lineId)
}

function routeLabel(lang: Lang, key: 'operator' | 'routeNumber' | 'journey' | 'progress'): string {
  const labels = {
    en: { operator: 'Operator', routeNumber: 'Route', journey: 'Journey', progress: 'Progress' },
    zh: { operator: '\u71df\u8fa6\u5546', routeNumber: '\u8def\u7dda', journey: '\u884c\u7a0b', progress: '\u9032\u5ea6' },
    pt: { operator: 'Operador', routeNumber: 'Rota', journey: 'Viagem', progress: 'Progresso' },
  } as const
  return labels[lang][key]
}

export function InfoPanel({ data, vehicle }: Props) {
  const { lang, t } = useI18n()
  const stationById = new Map((data?.stations ?? []).map(station => [station.id, station] as const))
  const line = data?.railLines.find(item => item.id === vehicle?.lineId)
  const nextStop: Station | undefined = vehicle?.nextStopId ? stationById.get(vehicle.nextStopId) : undefined
  const destination: Station | undefined = vehicle?.destinationId ? stationById.get(vehicle.destinationId) : undefined
  const flight = flightForVehicle(data, vehicle)
  const route = routeForVehicle(data, vehicle)

  return (
    <section className="info-panel">
      <h2>{vehicle ? t.selectedVehicle : t.noSelection}</h2>
      {vehicle?.type === 'flight' && (
        <div className="info-grid">
          <span className="line-chip" style={{ borderColor: vehicle.color, color: vehicle.color }}>
            {lang === 'zh' ? vehicle.labelZh : lang === 'pt' ? vehicle.labelPt : vehicle.labelEn}
          </span>
          {flight && <>
            <p>{flightLabel(lang, 'flight')}: <strong>{flight.flightNumbers.join(' / ')}</strong></p>
            <p>{flightLabel(lang, 'airline')}: <strong>{flight.airlineCode ?? '-'}</strong></p>
            <p>{flightLabel(lang, 'route')}: <strong>{localizedFlightValue(flight.localized.origin, lang, flight.origin) || 'HKIA'} {flight.direction === 'arrival' ? '<-' : '->'} {localizedFlightValue(flight.localized.destination, lang, flight.destination) || 'HKIA'}</strong></p>
            <p>{flightLabel(lang, 'scheduled')}: <strong>{flight.scheduledTime}</strong></p>
            <p>{flightLabel(lang, 'status')}: <strong>{localizedFlightValue(flight.localized.status, lang, flight.status)}</strong></p>
            {flight.cargo && <p>{flightLabel(lang, 'cargo')}</p>}
          </>}
          <p>{flightLabel(lang, 'progress')}: <strong>{Math.round(vehicle.progress * 100)}%</strong></p>
        </div>
      )}
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
      {vehicle && route && (
        <div className="info-grid">
          <span className="line-chip" style={{ borderColor: route.color, color: route.color }}>
            {localName(route, lang)}
          </span>
          <p>{routeLabel(lang, 'operator')}: <strong>{route.operator}</strong></p>
          <p>{routeLabel(lang, 'routeNumber')}: <strong>{route.routeNumber}</strong></p>
          <p>{routeLabel(lang, 'journey')}: <strong>{route.journeyTimeMinutes} min</strong></p>
          <p>{routeLabel(lang, 'progress')}: <strong>{Math.round(vehicle.progress * 100)}%</strong></p>
        </div>
      )}
    </section>
  )
}
