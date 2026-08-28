import { localName, useI18n } from '../../i18n'
import type { AirportGroundFeature } from '../../dataAdapters/airportGround'
import type { AirportFacility, AirportFlight, BusRoute, FerryRoute, Lang, Station, TransitData, VehiclePosition } from '../../types'

interface Props {
  data: TransitData | null
  vehicle: VehiclePosition | null
  station: Station | null
  facility: AirportFacility | null
  groundFeature: AirportGroundFeature | null
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

export function routeForVehicle(data: TransitData | null, vehicle: VehiclePosition | null): BusRoute | FerryRoute | undefined {
  if (!data || !vehicle || !['bus', 'ferry', 'tram'].includes(vehicle.type)) return undefined
  if (vehicle.type === 'bus') return data.busRoutes?.find(route => route.id === vehicle.lineId)
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

export function infoLabel(lang: Lang, key: 'station' | 'lines' | 'coordinates' | 'progress'): string {
  const labels = {
    en: { station: 'Station', lines: 'Lines', coordinates: 'Coordinates', progress: 'Progress' },
    zh: { station: '\u8eca\u7ad9', lines: '\u8def\u7dda', coordinates: '\u5ea7\u6a19', progress: '\u9032\u5ea6' },
    pt: { station: 'Estacao', lines: 'Linhas', coordinates: 'Coordenadas', progress: 'Progresso' },
  } as const
  return labels[lang][key]
}

export function stationLineNames(data: TransitData | null, station: Station | null, lang: Lang): string[] {
  if (!station) return []
  const lines = new Map((data?.railLines ?? []).map(line => [line.id, localName(line, lang)] as const))
  return station.lineIds.map(lineId => lines.get(lineId) || lineId)
}

function facilityLabel(lang: Lang, key: 'airport' | 'iata' | 'icao' | 'coordinates' | 'source' | 'feature' | 'snapshot'): string {
  const labels = {
    en: { airport: 'Airport', iata: 'IATA', icao: 'ICAO', coordinates: 'Coordinates', source: 'Source', feature: 'Feature', snapshot: 'Snapshot' },
    zh: { airport: '\u6a5f\u5834', iata: 'IATA', icao: 'ICAO', coordinates: '\u5ea7\u6a19', source: '\u8cc7\u6599\u4f86\u6e90', feature: '\u5730\u7269', snapshot: '\u5feb\u7167' },
    pt: { airport: 'Aeroporto', iata: 'IATA', icao: 'ICAO', coordinates: 'Coordenadas', source: 'Fonte', feature: 'Elemento', snapshot: 'Snapshot' },
  } as const
  return labels[lang][key]
}

export function InfoPanel({ data, vehicle, station, facility, groundFeature }: Props) {
  const { lang, t } = useI18n()
  const stationById = new Map((data?.stations ?? []).map(station => [station.id, station] as const))
  const line = data?.railLines.find(item => item.id === vehicle?.lineId)
  const nextStop: Station | undefined = vehicle?.nextStopId ? stationById.get(vehicle.nextStopId) : undefined
  const destination: Station | undefined = vehicle?.destinationId ? stationById.get(vehicle.destinationId) : undefined
  const flight = flightForVehicle(data, vehicle)
  const route = routeForVehicle(data, vehicle)
  const stationLines = stationLineNames(data, station, lang)

  return (
    <section className="info-panel">
      <h2>{vehicle ? t.selectedVehicle : station ? localName(station, lang) : facility ? localName(facility, lang) : groundFeature ? groundFeature.ref : t.noSelection}</h2>
      {!vehicle && station && (
        <div className="info-grid">
          <p>{infoLabel(lang, 'station')}: <strong>{localName(station, lang)}</strong></p>
          <p>{infoLabel(lang, 'lines')}: <strong>{stationLines.join(', ') || '-'}</strong></p>
          <p>{infoLabel(lang, 'coordinates')}: <strong>{station.coordinates.map(value => value.toFixed(5)).join(', ')}</strong></p>
        </div>
      )}
      {!vehicle && !station && facility && (
        <div className="info-grid">
          <p>{facilityLabel(lang, 'airport')}: <strong>{localName(facility, lang)}</strong></p>
          <p>{facilityLabel(lang, 'iata')}: <strong>{facility.iataCode}</strong></p>
          <p>{facilityLabel(lang, 'icao')}: <strong>{facility.icaoCode}</strong></p>
          <p>{facilityLabel(lang, 'coordinates')}: <strong>{facility.coordinates.map(value => value.toFixed(5)).join(', ')}</strong></p>
          <p>{facilityLabel(lang, 'source')}: <a href={facility.sourceUrl} target="_blank" rel="noreferrer">AIP</a></p>
        </div>
      )}
      {!vehicle && !station && !facility && groundFeature && (
        <div className="info-grid">
          <p>{facilityLabel(lang, 'feature')}: <strong>{localName(groundFeature, lang)}</strong></p>
          <p>{facilityLabel(lang, 'feature')}: <strong>{groundFeature.kind === 'terminal' ? (lang === 'zh' ? '\u5ba2\u904b\u5927\u6a13' : lang === 'pt' ? 'Terminal' : 'Terminal') : (lang === 'zh' ? '\u767b\u6a5f\u9580' : lang === 'pt' ? 'Porta' : 'Gate')}</strong></p>
          <p>{lang === 'zh' ? '\u53c3\u8003' : lang === 'pt' ? 'Referencia' : 'Reference'}: <strong>{groundFeature.ref}</strong></p>
          <p>{facilityLabel(lang, 'coordinates')}: <strong>{groundFeature.coordinates.map(value => value.toFixed(5)).join(', ')}</strong></p>
          <p>{facilityLabel(lang, 'snapshot')}: <strong>{groundFeature.sourceTimestamp}</strong></p>
          <p>{facilityLabel(lang, 'source')}: <a href={groundFeature.sourceUrl} target="_blank" rel="noreferrer">OSM</a></p>
        </div>
      )}
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
          <p>{infoLabel(lang, 'progress')}: <strong>{Math.round(vehicle.progress * 100)}%</strong></p>
        </div>
      )}
      {vehicle && route && (
        <div className="info-grid">
          <span className="line-chip" style={{ borderColor: route.color, color: route.color }}>
            {localName(route, lang)}
          </span>
          <p>{routeLabel(lang, 'operator')}: <strong>{route.operator}</strong></p>
          <p>{routeLabel(lang, 'routeNumber')}: <strong>{route.routeNumber}</strong></p>
          {'journeyTimeMinutes' in route && <p>{routeLabel(lang, 'journey')}: <strong>{route.journeyTimeMinutes} min</strong></p>}
          <p>{routeLabel(lang, 'progress')}: <strong>{Math.round(vehicle.progress * 100)}%</strong></p>
        </div>
      )}
    </section>
  )
}
