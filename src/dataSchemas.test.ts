import { describe, expect, it } from 'vitest'
import railLines from '../public/data/rail-lines.json'
import stations from '../public/data/stations.json'
import trips from '../public/data/trips-weekday.json'
import weekendTrips from '../public/data/trips-weekend.json'
import { BusRoutesSchema, RailLinesSchema, StationsSchema, TripsSchema, validateTransitData } from './dataSchemas'

describe('committed data files', () => {
  it('accepts a normalized bus route contract', () => {
    const result = BusRoutesSchema.safeParse([{
      id: 'kmb-1',
      operator: 'KMB',
      routeNumber: '1',
      nameEn: 'Chuk Yuen Estate - Star Ferry',
      nameZh: '竹園邨 - 天星碼頭',
      namePt: 'Chuk Yuen Estate - Star Ferry',
      color: '#d22b2b',
      stopIds: ['stop-a', 'stop-b'],
      geometry: [[114.17, 22.34], [114.18, 22.30]],
    }])

    expect(result.success).toBe(true)
  })

  it('rejects a bus route without enough ordered stops or geometry points', () => {
    const result = BusRoutesSchema.safeParse([{
      id: 'citybus-10',
      operator: 'Citybus',
      routeNumber: '10',
      nameEn: 'Kennedy Town - North Point',
      nameZh: '堅尼地城 - 北角',
      color: '#f1a208',
      stopIds: ['stop-a'],
      geometry: [[114.15, 22.29]],
    }])

    expect(result.success).toBe(false)
  })

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
