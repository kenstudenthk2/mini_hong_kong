import { useEffect, useState } from 'react'
import type { TransitData } from '../types'
import { normalizeCitybusEta, normalizeCitybusRoutes, selectCitybusRoutes, type CitybusRouteSnapshot } from '../dataAdapters/citybus'
import { normalizeFerryGeoJson } from '../dataAdapters/ferry'
import { normalizeFerryGtfsSchedules, normalizeTramGtfsSchedules, type FerryGtfsSnapshot } from '../dataAdapters/ferrySchedule'
import { normalizeTramGeoJson } from '../dataAdapters/tram'
import { normalizeKmbEta, normalizeKmbRoutes, type KmbRouteSnapshot } from '../dataAdapters/kmb'
import { nlbEtaFeaturedRouteId, nlbEtaStopLimit, nlbFeaturedRouteIds, normalizeNlbEta, normalizeNlbRoutes, type NlbRouteSnapshot } from '../dataAdapters/nlb'
import { loadGmbFeed } from '../dataAdapters/gmb'
import { loadHkgFlights } from '../dataAdapters/flight'
import { assertValidTransitData, parseData, RailLinesSchema, StationsSchema, TripsSchema } from '../dataSchemas'

export type FeedStatus = 'pending' | 'ready' | 'unavailable'

export interface TransitDataState {
  data: TransitData | null
  loading: boolean
  error: string | null
  feedStatus: {
    optionalTransit: FeedStatus
    gtfsSchedules: FeedStatus
    flights: FeedStatus
  }
}

async function loadJson(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  return response.json()
}

async function loadText(path: string): Promise<string> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  return response.text()
}

interface KmbEnvelope {
  generated_timestamp: string
  data: Record<string, unknown>[]
}

interface KmbArrivalFeed {
  arrivals: NonNullable<TransitData['busArrivals']>
  generatedAt: string
}

interface CitybusEnvelope {
  generated_timestamp: string
  data: Record<string, unknown>[]
}

interface CitybusStopResponse {
  data: Record<string, unknown>
}

interface GtfsScheduleFeed {
  ferrySchedules: NonNullable<TransitData['ferrySchedules']>
  tramSchedules: NonNullable<TransitData['tramSchedules']>
}

interface OptionalTransitFeed {
  busRoutes: NonNullable<TransitData['busRoutes']>
  busArrivals: NonNullable<TransitData['busArrivals']>
  busDataTimestamp: string
  ferryRoutes: NonNullable<TransitData['ferryRoutes']>
  tramRoutes: NonNullable<TransitData['tramRoutes']>
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

async function loadKmbRoutes(): Promise<TransitData['busRoutes']> {
  const [rawRoutes, rawRouteStops, rawStops] = await Promise.all([
    loadJson('https://data.etabus.gov.hk/v1/transport/kmb/route/') as Promise<KmbEnvelope>,
    loadJson('https://data.etabus.gov.hk/v1/transport/kmb/route-stop/') as Promise<KmbEnvelope>,
    loadJson('https://data.etabus.gov.hk/v1/transport/kmb/stop/') as Promise<KmbEnvelope>,
  ])
  return normalizeKmbRoutes({
    generatedAt: rawRoutes.generated_timestamp,
    routes: rawRoutes.data as KmbRouteSnapshot['routes'],
    routeStops: rawRouteStops.data as KmbRouteSnapshot['routeStops'],
    stops: rawStops.data as KmbRouteSnapshot['stops'],
  })
}

async function loadKmbArrivals(): Promise<KmbArrivalFeed> {
  const raw = await loadJson('https://data.etabus.gov.hk/v1/transport/kmb/route-eta/1/1') as KmbEnvelope
  return {
    arrivals: normalizeKmbEta(raw),
    generatedAt: raw.generated_timestamp,
  }
}

async function loadCitybusRoutes(): Promise<TransitData['busRoutes']> {
  const rawRoutes = await loadJson('https://rt.data.gov.hk/v2/transport/citybus/route/CTB') as CitybusEnvelope
  const routes = selectCitybusRoutes(rawRoutes.data as CitybusRouteSnapshot['routes'])
  const routeStops = (await mapWithConcurrency(
    routes.flatMap(route => ['inbound', 'outbound'].map(direction => ({ route: route.route, direction }))),
    4,
    async ({ route, direction }) => {
      const response = await loadJson(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}/${direction}`) as CitybusEnvelope
      return response.data
    },
  )).flat() as CitybusRouteSnapshot['routeStops']
  const stopIds = [...new Set(routeStops.map(stop => String(stop.stop)))]
  const stops = (await mapWithConcurrency(stopIds, 8, async stopId => {
    const response = await loadJson(`https://rt.data.gov.hk/v2/transport/citybus/stop/${stopId}`) as CitybusStopResponse
    return response.data
  })) as CitybusRouteSnapshot['stops']

  return normalizeCitybusRoutes({
    generatedAt: rawRoutes.generated_timestamp,
    routes,
    routeStops,
    stops,
  })
}

async function loadCitybusArrivals(): Promise<TransitData['busArrivals']> {
  const routeStops = (await Promise.all(['inbound', 'outbound'].map(async direction => {
    const response = await loadJson(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/1/${direction}`) as CitybusEnvelope
    return response.data
  }))).flat() as CitybusRouteSnapshot['routeStops']

  const arrivals = await mapWithConcurrency(routeStops, 8, async stop => {
    const raw = await loadJson(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${stop.stop}/1`)
    return normalizeCitybusEta(raw)
  })
  return arrivals.flat()
}

async function loadFerryRoutes(): Promise<TransitData['ferryRoutes']> {
  const raw = await loadJson('https://static.data.gov.hk/td/routes-fares-geojson/JSON_FERRY.json')
  return normalizeFerryGeoJson(raw)
}

async function loadTramRoutes(): Promise<TransitData['tramRoutes']> {
  const raw = await loadJson('https://static.data.gov.hk/td/routes-fares-geojson/JSON_TRAM.json')
  return normalizeTramGeoJson(raw)
}

async function loadNlbFeed(): Promise<{ routes: NonNullable<TransitData['busRoutes']>; busArrivals: NonNullable<TransitData['busArrivals']> }> {
  const rawRoutes = await loadJson('https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list') as { routes: NlbRouteSnapshot['routes'] }
  const featuredIds = new Set<string>(nlbFeaturedRouteIds)
  const routes = rawRoutes.routes.filter(route => featuredIds.has(route.routeId))
  const stopEntries = await mapWithConcurrency(routes, 2, async route => {
    const rawStops = await loadJson(`https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=list&routeId=${encodeURIComponent(route.routeId)}`) as { stops: NlbRouteSnapshot['stopsByRoute'][string] }
    return [route.routeId, rawStops.stops] as const
  })
  const stopsByRoute = Object.fromEntries(stopEntries)
  const normalizedRoutes = normalizeNlbRoutes({ routes, stopsByRoute })
  const etaRoute = routes.find(route => route.routeId === nlbEtaFeaturedRouteId)
  const etaStops = etaRoute ? (stopsByRoute[etaRoute.routeId] ?? []).slice(0, nlbEtaStopLimit) : []
  const etaRequests = etaStops.map((stop, index) => ({ stop, index }))
  const busArrivals = etaRoute ? (await mapWithConcurrency(etaRequests, 2, async ({ stop, index }) => {
    const rawEta = await loadJson(`https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=estimatedArrivals&language=en&routeId=${encodeURIComponent(etaRoute.routeId)}&stopId=${encodeURIComponent(stop.stopId)}`)
    const destinationEn = etaRoute.routeName_e.split('>').at(-1)?.trim() ?? etaRoute.routeName_e
    const destinationZh = etaRoute.routeName_c.split('>').at(-1)?.trim() ?? etaRoute.routeName_c
    return normalizeNlbEta(rawEta, { routeId: `nlb-${etaRoute.routeId}`, stopSequence: index + 1, destinationEn, destinationZh })
  })).flat() : []
  return { routes: normalizedRoutes, busArrivals }
}

async function loadGmbRuntimeFeed(): Promise<{ routes: NonNullable<TransitData['busRoutes']>; busArrivals: NonNullable<TransitData['busArrivals']> }> {
  return loadGmbFeed(loadJson)
}

async function loadGtfsSchedules(): Promise<GtfsScheduleFeed> {
  const [routes, trips, stopTimes, calendar] = await Promise.all([
    loadText('https://static.data.gov.hk/td/pt-headway-en/routes.txt'),
    loadText('https://static.data.gov.hk/td/pt-headway-en/trips.txt'),
    loadText('https://static.data.gov.hk/td/pt-headway-en/stop_times.txt'),
    loadText('https://static.data.gov.hk/td/pt-headway-en/calendar.txt'),
  ])
  const snapshot = { routes, trips, stopTimes, calendar } satisfies FerryGtfsSnapshot
  return {
    ferrySchedules: normalizeFerryGtfsSchedules(snapshot),
    tramSchedules: normalizeTramGtfsSchedules(snapshot),
  }
}

async function loadOptionalTransitFeed(): Promise<OptionalTransitFeed> {
  const [kmbRoutes, citybusRoutes, citybusArrivals, ferryRoutes, tramRoutes, nlbFeed, gmbFeed, busFeed] = await Promise.all([
    loadKmbRoutes().catch(() => []),
    loadCitybusRoutes().catch(() => []),
    loadCitybusArrivals().catch(() => []),
    loadFerryRoutes().catch(() => []),
    loadTramRoutes().catch(() => []),
    loadNlbFeed().catch(() => ({ routes: [], busArrivals: [] })),
    loadGmbRuntimeFeed().catch(() => ({ routes: [], busArrivals: [] })),
    loadKmbArrivals().catch(() => ({ arrivals: [], generatedAt: '' })),
  ])
  return {
    busRoutes: [...(kmbRoutes ?? []), ...(citybusRoutes ?? []), ...(nlbFeed.routes ?? []), ...(gmbFeed.routes ?? [])],
    busArrivals: [...busFeed.arrivals, ...(citybusArrivals ?? []), ...(nlbFeed.busArrivals ?? []), ...(gmbFeed.busArrivals ?? [])],
    busDataTimestamp: busFeed.generatedAt,
    ferryRoutes: ferryRoutes ?? [],
    tramRoutes: tramRoutes ?? [],
  }
}

export function useTransitData(): TransitDataState {
  const [state, setState] = useState<TransitDataState>({
    data: null,
    loading: true,
    error: null,
    feedStatus: { optionalTransit: 'pending', gtfsSchedules: 'pending', flights: 'pending' },
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [rawLines, rawStations, rawWeekdayTrips, rawWeekendTrips] = await Promise.all([
          loadJson('/data/rail-lines.json'),
          loadJson('/data/stations.json'),
          loadJson('/data/trips-weekday.json'),
          loadJson('/data/trips-weekend.json'),
        ])
        if (cancelled) return
        const data = assertValidTransitData({
          railLines: parseData(RailLinesSchema, rawLines, 'rail-lines.json'),
          stations: parseData(StationsSchema, rawStations, 'stations.json'),
          trips: [
            ...parseData(TripsSchema, rawWeekdayTrips, 'trips-weekday.json'),
            ...parseData(TripsSchema, rawWeekendTrips, 'trips-weekend.json'),
          ],
          busRoutes: [],
          busArrivals: [],
          busDataTimestamp: '',
          ferryRoutes: [],
          tramRoutes: [],
        })
        setState({
          loading: false,
          error: null,
          data,
          feedStatus: { optionalTransit: 'pending', gtfsSchedules: 'pending', flights: 'pending' },
        })
        loadOptionalTransitFeed().then(optionalFeed => {
          if (cancelled) return
          const hasOptionalData = optionalFeed.busRoutes.length > 0 || optionalFeed.ferryRoutes.length > 0 || optionalFeed.tramRoutes.length > 0
          setState(current => current.data ? { ...current, data: { ...current.data, ...optionalFeed }, feedStatus: { ...current.feedStatus, optionalTransit: hasOptionalData ? 'ready' : 'unavailable' } } : current)
        }).catch(() => {
          if (!cancelled) setState(current => ({ ...current, feedStatus: { ...current.feedStatus, optionalTransit: 'unavailable' } }))
        })
        loadGtfsSchedules().then(scheduleFeed => {
          if (cancelled) return
          const hasSchedules = scheduleFeed.ferrySchedules.length > 0 || scheduleFeed.tramSchedules.length > 0
          setState(current => current.data ? { ...current, data: { ...current.data, ...scheduleFeed }, feedStatus: { ...current.feedStatus, gtfsSchedules: hasSchedules ? 'ready' : 'unavailable' } } : current)
        }).catch(() => {
          if (!cancelled) setState(current => ({ ...current, feedStatus: { ...current.feedStatus, gtfsSchedules: 'unavailable' } }))
        })
        loadHkgFlights().then(flights => {
          if (cancelled) return
          setState(current => current.data ? { ...current, data: { ...current.data, flights }, feedStatus: { ...current.feedStatus, flights: flights.length > 0 ? 'ready' : 'unavailable' } } : current)
        }).catch(() => {
          if (!cancelled) setState(current => ({ ...current, feedStatus: { ...current.feedStatus, flights: 'unavailable' } }))
        })
      } catch (err) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err), feedStatus: { optionalTransit: 'unavailable', gtfsSchedules: 'unavailable', flights: 'unavailable' } })
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
