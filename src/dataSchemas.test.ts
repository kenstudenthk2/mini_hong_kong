import { describe, expect, it } from 'vitest'
import railLines from '../public/data/rail-lines.json'
import stations from '../public/data/stations.json'
import trips from '../public/data/trips-weekday.json'
import weekendTrips from '../public/data/trips-weekend.json'
import { RailLinesSchema, StationsSchema, TripsSchema, validateTransitData } from './dataSchemas'

describe('committed data files', () => {
  it('validates rail lines', () => {
    expect(RailLinesSchema.safeParse(railLines).success).toBe(true)
  })

  it('validates stations', () => {
    expect(StationsSchema.safeParse(stations).success).toBe(true)
  })

  it('validates trips', () => {
    expect(TripsSchema.safeParse(trips).success).toBe(true)
    expect(TripsSchema.safeParse(weekendTrips).success).toBe(true)
  })

  it('validates cross-file transit references', () => {
    const data = {
      railLines: RailLinesSchema.parse(railLines),
      stations: StationsSchema.parse(stations),
      trips: [...TripsSchema.parse(trips), ...TripsSchema.parse(weekendTrips)],
    }
    expect(validateTransitData(data)).toEqual([])
  })

  it('rejects unknown trip line references', () => {
    const data = {
      railLines: RailLinesSchema.parse(railLines),
      stations: StationsSchema.parse(stations),
      trips: [{ ...TripsSchema.parse(trips)[0], lineId: 'missing-line' }],
    }
    expect(validateTransitData(data)).toContain('trip island-eastbound references unknown line missing-line')
  })
})
