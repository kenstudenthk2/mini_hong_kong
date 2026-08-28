import { useEffect, useState } from 'react'
import type { TransitData } from '../types'
import { normalizeKmbRoutes, type KmbRouteSnapshot } from '../dataAdapters/kmb'
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

interface KmbEnvelope {
  generated_timestamp: string
  data: Record<string, unknown>[]
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

export function useTransitData(): TransitDataState {
  const [state, setState] = useState<TransitDataState>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [rawLines, rawStations, rawWeekdayTrips, rawWeekendTrips, busRoutes] = await Promise.all([
          loadJson('/data/rail-lines.json'),
          loadJson('/data/stations.json'),
          loadJson('/data/trips-weekday.json'),
          loadJson('/data/trips-weekend.json'),
          loadKmbRoutes().catch(() => []),
        ])
        if (cancelled) return
        const data = assertValidTransitData({
          railLines: parseData(RailLinesSchema, rawLines, 'rail-lines.json'),
          stations: parseData(StationsSchema, rawStations, 'stations.json'),
          trips: [
            ...parseData(TripsSchema, rawWeekdayTrips, 'trips-weekday.json'),
            ...parseData(TripsSchema, rawWeekendTrips, 'trips-weekend.json'),
          ],
          busRoutes,
        })
        setState({
          loading: false,
          error: null,
          data,
        })
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
