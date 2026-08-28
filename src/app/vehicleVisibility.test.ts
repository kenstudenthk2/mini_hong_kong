import { describe, expect, it } from 'vitest'
import { isVehicleVisible } from './vehicleVisibility'
import type { VehiclePosition } from '../types'

const vehicle = (type: VehiclePosition['type'], lineId: string): VehiclePosition => ({
  id: `${type}-${lineId}`,
  type,
  lineId,
  tripId: 'trip-1',
  color: '#fff',
  coordinates: [114, 22.3],
  bearing: 0,
  progress: 0.5,
  labelEn: 'Vehicle',
  labelZh: '\u73ed\u8eca',
  labelPt: 'Veiculo',
  nextStopId: null,
  destinationId: null,
})

describe('isVehicleVisible', () => {
  const rail = new Set(['mtr-east'])
  const routes = new Set(['ferry-central'])
  const operators = new Set(['KMB/LWB'])

  it('applies the matching visibility set for each mode', () => {
    expect(isVehicleVisible(vehicle('bus', 'citybus-1'), rail, routes, operators)).toBe(false)
    expect(isVehicleVisible(vehicle('ferry', 'ferry-central'), rail, routes, operators)).toBe(true)
    expect(isVehicleVisible(vehicle('mtr', 'mtr-east'), rail, routes, operators)).toBe(true)
    expect(isVehicleVisible(vehicle('mtr', 'mtr-west'), rail, routes, operators)).toBe(false)
    expect(isVehicleVisible(vehicle('flight', 'hkg-rwy-1'), rail, routes, operators)).toBe(true)
  })
})
