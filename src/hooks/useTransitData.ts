import { useEffect, useState } from 'react'
import type { TransitData } from '../types'
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

export function useTransitData(): TransitDataState {
  const [state, setState] = useState<TransitDataState>({ data: null, loading: true, error: null })

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
