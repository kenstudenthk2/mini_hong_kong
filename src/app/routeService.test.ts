import { describe, expect, it } from 'vitest'
import { busRouteServiceCount } from './routeService'
import type { BusRoute, VehiclePosition } from '../types'

const route = (id: string, operator: string): BusRoute => ({
  id,
  operator,
  routeNumber: id,
  color: '#0f766e',
  nameEn: id,
  nameZh: id,
  geometry: [[114, 22.3], [114.01, 22.31]],
  stopIds: [],
})

const vehicle = (lineId: string): VehiclePosition => ({
  id: `bus-${lineId}`,
  type: 'bus',
  lineId,
  tripId: 'trip-1',
  color: '#0f766e',
  coordinates: [114, 22.3],
  bearing: 0,
  progress: 0.5,
  labelEn: 'Bus',
  labelZh: '\u5df4\u58eb',
  labelPt: 'Autocarro',
  nextStopId: null,
  destinationId: null,
})

describe('busRouteServiceCount', () => {
  it('counts active routes against the complete operator dataset', () => {
    expect(busRouteServiceCount([route('kmb-1', 'KMB/LWB'), route('kmb-2', 'KMB/LWB'), route('citybus-10', 'Citybus')], [vehicle('kmb-1')], 'KMB/LWB')).toEqual({ active: 1, total: 2 })
  })
})
