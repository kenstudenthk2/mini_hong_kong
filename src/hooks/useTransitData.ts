import { useEffect, useState } from 'react'
import type { TransitData } from '../types'
import { normalizeCitybusEta, normalizeCitybusRoutes, selectCitybusRoutes, type CitybusRouteSnapshot } from '../dataAdapters/citybus'
import { normalizeFerryGeoJson } from '../dataAdapters/ferry'
import { normalizeFerryGtfsSchedules, type FerryGtfsSnapshot } from '../dataAdapters/ferrySchedule'
import { normalizeTramGeoJson } from '../dataAdapters/tram'
import { normalizeKmbEta, normalizeKmbRoutes, type KmbRouteSnapshot } from '../dataAdapters/kmb'
import { assertValidTransitData, parseData, RailLinesSchema, StationsSchema, TripsSchema } from '../dataSchemas'

interface TransitDataState {
  data: TransitData | null
  loading: boolean
  error: string | null
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

async function loadFerrySchedules(): Promise<NonNullable<TransitData['ferrySchedules']>> {
  const [routes, trips, stopTimes, calendar] = await Promise.all([
    loadText('https://static.data.gov.hk/td/pt-headway-en/routes.txt'),
    loadText('https://static.data.gov.hk/td/pt-headway-en/trips.txt'),
    loadText('https://static.data.gov.hk/td/pt-headway-en/stop_times.txt'),
    loadText('https://static.data.gov.hk/td/pt-headway-en/calendar.txt'),
  ])
  return normalizeFerryGtfsSchedules({ routes, trips, stopTimes, calendar } satisfies FerryGtfsSnapshot)
}

export function useTransitData(): TransitDataState {
  const [state, setState] = useState<TransitDataState>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [rawLines, rawStations, rawWeekdayTrips, rawWeekendTrips, kmbRoutes, citybusRoutes, citybusArrivals, ferryRoutes, tramRoutes, busFeed] = await Promise.all([
          loadJson('/data/rail-lines.json'),
          loadJson('/data/stations.json'),
          loadJson('/data/trips-weekday.json'),
          loadJson('/data/trips-weekend.json'),
          loadKmbRoutes().catch(() => []),
          loadCitybusRoutes().catch(() => []),
          loadCitybusArrivals().catch(() => []),
          loadFerryRoutes().catch(() => []),
          loadTramRoutes().catch(() => []),
          loadKmbArrivals().catch(() => ({ arrivals: [], generatedAt: '' })),
        ])
        if (cancelled) return
        const data = assertValidTransitData({
          railLines: parseData(RailLinesSchema, rawLines, 'rail-lines.json'),
          stations: parseData(StationsSchema, rawStations, 'stations.json'),
          trips: [
            ...parseData(TripsSchema, rawWeekdayTrips, 'trips-weekday.json'),
            ...parseData(TripsSchema, rawWeekendTrips, 'trips-weekend.json'),
          ],
          busRoutes: [...(kmbRoutes ?? []), ...(citybusRoutes ?? [])],
          busArrivals: [...busFeed.arrivals, ...(citybusArrivals ?? [])],
          busDataTimestamp: busFeed.generatedAt,
          ferryRoutes,
          tramRoutes,
        })
        setState({
          loading: false,
          error: null,
          data,
        })
        loadFerrySchedules().then(ferrySchedules => {
          if (cancelled) return
          setState(current => current.data ? { ...current, data: { ...current.data, ferrySchedules } } : current)
        }).catch(() => undefined)
      } catch (err) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) })
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
