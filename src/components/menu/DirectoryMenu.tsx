import { localName, useI18n } from '../../i18n'
import { classifyFreshness } from '../../dataAdapters/freshness'
import { HKG_AIP_SOURCE } from '../../dataAdapters/airport'
import { HKIA_OSM_SOURCE, HKIA_OSM_TIMESTAMP } from '../../dataAdapters/airportGround'
import { layerManifest } from '../../dataAdapters/layerManifest'
import { searchRoutes, type SearchableRoute } from '../../app/routeSearch'
import type { TransitDataState } from '../../hooks/useTransitData'
import type { AirportFlight, FerryRoute, Lang, RailLine, Station, TransitData, TramRoute, VehiclePosition } from '../../types'

interface Props {
  data: TransitData | null
  vehicles: VehiclePosition[]
  selectedLineIds: Set<string>
  onToggleLine: (lineId: string) => void
  selectedRouteIds: Set<string>
  onToggleRoute: (routeId: string) => void
  selectedBusOperators: Set<string>
  onToggleBusOperator: (operator: string) => void
  onResetFilters: () => void
  liveBusMode: boolean
  hasLiveBusData: boolean
  stations: Station[]
  selectedStationId: string | null
  onSelectStation: (station: Station | null) => void
  routeSearchQuery: string
  onRouteSearchQueryChange: (query: string) => void
  selectedRouteSearchId: string | null
  onSelectRouteSearch: (route: SearchableRoute | null) => void
  feedStatus: TransitDataState['feedStatus']
}

type DirectoryRoute = RailLine | FerryRoute | TramRoute

function LineRow({ line, enabled, onToggle }: { line: DirectoryRoute; enabled: boolean; onToggle: () => void }) {
  const { lang } = useI18n()
  return (
    <button className="line-row" type="button" onClick={onToggle} aria-pressed={enabled}>
      <span className="line-dot" style={{ background: line.color }} />
      <span>{localName(line, lang)}</span>
      <span className="line-state">{enabled ? 'ON' : 'OFF'}</span>
    </button>
  )
}

function OperatorRow({ operator, enabled, onToggle }: { operator: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button className="line-row" type="button" onClick={onToggle} aria-pressed={enabled}>
      <span className="line-dot" style={{ background: operator === 'Citybus' ? '#dc2626' : '#0f766e' }} />
      <span>{operator}</span>
      <span className="line-state">{enabled ? 'ON' : 'OFF'}</span>
    </button>
  )
}

function busOperatorForVehicle(vehicle: VehiclePosition): string | null {
  if (vehicle.type !== 'bus') return null
  return vehicle.lineId.startsWith('citybus-') ? 'Citybus' : 'KMB/LWB'
}

function flightText(values: Partial<Record<'en' | 'zh_HK' | 'zh_CN', string>>, lang: Lang, fallback: string | null): string {
  const preferred = lang === 'zh' ? ['zh_HK', 'zh_CN', 'en'] : ['en', 'zh_HK', 'zh_CN']
  return preferred.map(key => values[key as keyof typeof values]).find(Boolean) ?? fallback ?? '-'
}

function FlightRow({ flight }: { flight: AirportFlight }) {
  const { lang, t } = useI18n()
  const origin = flightText(flight.localized.origin, lang, flight.origin)
  const destination = flightText(flight.localized.destination, lang, flight.destination)
  const status = flightText(flight.localized.status, lang, flight.status)
  const direction = flight.direction === 'arrival' ? t.arrival : t.departure
  return (
    <div className="flight-row">
      <strong>{flight.flightNumbers.join(' / ')}</strong>
      <span>{direction}{flight.cargo ? ` · ${t.cargo}` : ''} · {flight.scheduledTime}</span>
      <span>{origin} {flight.direction === 'arrival' ? '<-' : '->'} {destination}</span>
      <span>{status}</span>
    </div>
  )
}

export function DirectoryMenu({ data, vehicles, selectedLineIds, onToggleLine, selectedRouteIds, onToggleRoute, selectedBusOperators, onToggleBusOperator, onResetFilters, liveBusMode, hasLiveBusData, stations, selectedStationId, onSelectStation, routeSearchQuery, onRouteSearchQueryChange, selectedRouteSearchId, onSelectRouteSearch, feedStatus }: Props) {
  const { lang, t } = useI18n()
  const mtrLines = data?.railLines.filter(line => line.mode === 'mtr') ?? []
  const lightRailLines = data?.railLines.filter(line => line.mode === 'light_rail') ?? []
  const flights = data?.flights ?? []
  const activeFlightMovements = vehicles.filter(vehicle => vehicle.type === 'flight').length
  const visibleBusCount = vehicles.filter(vehicle => {
    const operator = busOperatorForVehicle(vehicle)
    return operator !== null && selectedBusOperators.has(operator)
  }).length
  const flightDate = flights[0]?.date
  const kmbFreshness = data?.busDataTimestamp
    ? classifyFreshness(data.busDataTimestamp, new Date(), 1)
    : 'invalid'
  const aipRevision = HKG_AIP_SOURCE.match(/eaip_(\d{8})/)?.[1] ?? '-'
  const searchableRoutes: SearchableRoute[] = [...mtrLines, ...lightRailLines, ...(data?.busRoutes ?? []), ...(data?.ferryRoutes ?? []), ...(data?.tramRoutes ?? [])]
  const routeSearchResults = searchRoutes(searchableRoutes, routeSearchQuery, lang).slice(0, 8)
  const feedStatusLabel = (status: TransitDataState['feedStatus']['optionalTransit']) => lang === 'zh' ? ({ pending: '\u8f09\u5165\u4e2d', ready: '\u5df2\u5c31\u7dd2', unavailable: '\u4e0d\u53ef\u7528' }[status]) : lang === 'pt' ? ({ pending: 'A carregar', ready: 'Disponivel', unavailable: 'Indisponivel' }[status]) : ({ pending: 'Pending', ready: 'Ready', unavailable: 'Unavailable' }[status])

  return (
    <aside className="directory-menu" aria-label="Transit directory">
      <header className="brand-block">
        <div className="brand-title">{t.appName}</div>
        <div className="brand-subtitle">{t.subtitle}</div>
        <button className="menu-reset" type="button" onClick={onResetFilters}>{t.reset}</button>
      </header>

      <details open className="menu-section">
        <summary>{t.rail}<span>{vehicles.filter(v => v.type === 'mtr').length}</span></summary>
        <div className="section-body">
          {mtrLines.map(line => (
            <LineRow
              key={line.id}
              line={line}
              enabled={selectedLineIds.has(line.id)}
              onToggle={() => onToggleLine(line.id)}
            />
          ))}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.lightRail}<span>{vehicles.filter(v => v.type === 'light_rail').length}</span></summary>
        <div className="section-body">
          {lightRailLines.map(line => (
            <LineRow
              key={line.id}
              line={line}
              enabled={selectedLineIds.has(line.id)}
              onToggle={() => onToggleLine(line.id)}
            />
          ))}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.buses}<span>{visibleBusCount}</span></summary>
        <div className="section-body muted-body">
          <div>{visibleBusCount} {t.vehicles}</div>
          <div>{(data?.busRoutes ?? []).filter(route => selectedBusOperators.has(route.operator)).length} normalized routes</div>
          {['KMB/LWB', 'Citybus'].map(operator => (
            <OperatorRow
              key={operator}
              operator={operator}
              enabled={selectedBusOperators.has(operator)}
              onToggle={() => onToggleBusOperator(operator)}
            />
          ))}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.ferries}<span>{vehicles.filter(vehicle => vehicle.type === 'ferry').length}</span></summary>
        <div className="section-body muted-body">
          <div>{data?.ferryRoutes?.length ?? 0} scheduled route geometries</div>
          {(data?.ferryRoutes ?? []).map(route => (
            <LineRow
              key={route.id}
              line={route}
              enabled={selectedRouteIds.has(route.id)}
              onToggle={() => onToggleRoute(route.id)}
            />
          ))}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.trams}<span>{vehicles.filter(vehicle => vehicle.type === 'tram').length}</span></summary>
        <div className="section-body muted-body">
          <div>{data?.tramRoutes?.length ?? 0} scheduled route geometries</div>
          {(data?.tramRoutes ?? []).map(route => (
            <LineRow
              key={route.id}
              line={route}
              enabled={selectedRouteIds.has(route.id)}
              onToggle={() => onToggleRoute(route.id)}
            />
          ))}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.flights}<span>{activeFlightMovements}</span></summary>
        <div className="section-body muted-body">
          <div>{flights.length ? `${flights.length} ${t.flightRecords}` : t.noFlightData}</div>
          <div>{activeFlightMovements} {t.activeMovements}</div>
          <div>{t.historical}: {flightDate ?? '-'}</div>
          <div>{t.source}: {t.dataGov}</div>
          {flights.length > 0 && <div className="flight-list">{flights.slice(0, 6).map(flight => <FlightRow key={flight.id} flight={flight} />)}</div>}
        </div>
      </details>

      <details open className="menu-section">
        <summary>{t.dataStatus}<span>{t.active}</span></summary>
        <div className="section-body status-list">
          <p>{t.simulation}: MTR + Light Rail + Buses + Ferries + Trams + Flights</p>
          <p>{lang === 'zh' ? '\u4ea4\u901a\u8cc7\u6599' : lang === 'pt' ? 'Transito' : 'Transit feeds'}: {feedStatusLabel(feedStatus.optionalTransit)}</p>
          <p>GTFS: {feedStatusLabel(feedStatus.gtfsSchedules)}</p>
          <p>{lang === 'zh' ? '\u822a\u73ed\u8cc7\u6599' : lang === 'pt' ? 'Voos' : 'Flight feed'}: {feedStatusLabel(feedStatus.flights)}</p>
          <p>{lang === 'zh' ? '\u5df4\u58eb\u6a21\u5f0f' : lang === 'pt' ? 'Modo dos autocarros' : 'Bus mode'}: {hasLiveBusData && liveBusMode ? (lang === 'zh' ? '\u5373\u6642 ETA' : lang === 'pt' ? 'ETA ao vivo' : 'Live ETA') : (lang === 'zh' ? '\u6642\u523b\u8868\u91cd\u64ad' : lang === 'pt' ? 'Replay de horario' : 'Schedule replay')}</p>
          {layerManifest.map(entry => (
            <p key={entry.id}>
              {lang === 'zh' ? entry.labelZh : lang === 'pt' ? entry.labelPt : entry.labelEn}: {entry.dataClass} · {entry.sourceUrl ? <a href={entry.sourceUrl} target="_blank" rel="noreferrer">{lang === 'zh' ? entry.sourceLabelZh : lang === 'pt' ? entry.sourceLabelPt : entry.sourceLabelEn}</a> : lang === 'zh' ? entry.sourceLabelZh : lang === 'pt' ? entry.sourceLabelPt : entry.sourceLabelEn}
            </p>
          ))}
          <p>KMB ETA: {kmbFreshness}</p>
          <p>{t.source}: {t.dataGov} seed-ready contracts</p>
          <p>{t.source}: HKIA AIP {aipRevision}</p>
          <p>{t.source}: OSM snapshot {HKIA_OSM_TIMESTAMP.slice(0, 10)}</p>
          <p><a href={HKG_AIP_SOURCE} target="_blank" rel="noreferrer">HKIA AIP</a> · <a href={HKIA_OSM_SOURCE} target="_blank" rel="noreferrer">OSM snapshot</a></p>
        </div>
      </details>

      <details className="menu-section">
        <summary>{lang === 'zh' ? '\u8eca\u7ad9\u641c\u5c0b' : lang === 'pt' ? 'Pesquisa de estacoes' : 'Station search'}<span>{stations.length}</span></summary>
        <div className="section-body">
          <select className="station-select" value={selectedStationId ?? ''} onChange={event => onSelectStation(stations.find(station => station.id === event.target.value) ?? null)}>
            <option value="">{lang === 'zh' ? '\u9078\u64c7\u8eca\u7ad9' : lang === 'pt' ? 'Selecionar estacao' : 'Select a station'}</option>
            {stations.map(station => <option key={station.id} value={station.id}>{localName(station, lang)}</option>)}
          </select>
        </div>
      </details>

      <details className="menu-section">
        <summary>{lang === 'zh' ? '\u8def\u7dda\u641c\u5c0b' : lang === 'pt' ? 'Pesquisa de rotas' : 'Route search'}<span>{routeSearchResults.length}</span></summary>
        <div className="section-body">
          <input
            type="search"
            value={routeSearchQuery}
            placeholder={lang === 'zh' ? '\u641c\u5c0b\u8def\u7dda\u6216\u71df\u8fa6\u5546' : lang === 'pt' ? 'Pesquisar rota ou operador' : 'Search route or operator'}
            onChange={event => onRouteSearchQueryChange(event.target.value)}
          />
          {routeSearchResults.map(route => (
            <button className="line-row" type="button" key={route.id} aria-pressed={selectedRouteSearchId === route.id} onClick={() => onSelectRouteSearch(route)}>
              <span className="line-dot" style={{ background: route.color }} />
              <span>{'routeNumber' in route ? `${route.routeNumber} · ` : ''}{localName(route, lang)}</span>
              <span className="line-state">{selectedRouteSearchId === route.id ? t.active : route.operator}</span>
            </button>
          ))}
        </div>
      </details>
    </aside>
  )
}
