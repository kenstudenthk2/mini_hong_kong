import { describe, expect, it } from 'vitest'
import { flightForVehicle } from './InfoPanel'
import type { TransitData, VehiclePosition } from '../../types'

const flightVehicle: VehiclePosition = {
  id: 'flight-replay',
  type: 'flight',
  lineId: 'hkg-rwy-07l-25r',
  tripId: '2026-08-28-departure-passenger-4',
  color: '#f97316',
  coordinates: [113.9, 22.3],
  bearing: 90,
  progress: 0.5,
  labelEn: 'HX246 - HKIA movement replay',
  labelZh: 'HX246 - 香港國際機場移動重播',
  labelPt: 'HX246 - Repeticao de movimento HKIA',
  nextStopId: null,
  destinationId: null,
}

describe('flight info resolution', () => {
  it('resolves the normalized flight record from a replay vehicle', () => {
    const data = { flights: [{ id: flightVehicle.tripId, flightNumbers: ['HX246'] }] } as TransitData
    expect(flightForVehicle(data, flightVehicle)?.flightNumbers).toEqual(['HX246'])
  })

  it('does not resolve a flight for another vehicle or missing record', () => {
    expect(flightForVehicle(null, flightVehicle)).toBeUndefined()
    expect(flightForVehicle({ flights: [] } as unknown as TransitData, flightVehicle)).toBeUndefined()
  })
})
