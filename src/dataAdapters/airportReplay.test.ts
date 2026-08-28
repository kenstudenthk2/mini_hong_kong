import { describe, expect, it } from 'vitest'
import { hkiaRunways } from './airport'
import { computeAirportFlightVehiclePositions } from './airportReplay'
import { hongKongWallToInstant } from '../engines/hongKongTime'
import type { AirportFlight } from '../types'

const flight: AirportFlight = {
  id: '2026-07-24-departure-passenger-12',
  date: '2026-07-24',
  direction: 'departure',
  cargo: false,
  sequence: 12,
  flightNumbers: ['HX246'],
  airlineCode: 'HX',
  origin: null,
  destination: 'Tokyo',
  scheduledTime: '06:10',
  statusCode: 'E',
  status: 'Departed',
  sourceLanguage: 'en',
  localized: { origin: {}, destination: { en: 'Tokyo' }, status: { en: 'Departed' } },
}

describe('computeAirportFlightVehiclePositions', () => {
  it('replays a scheduled departure along an AIP runway centerline', () => {
    const vehicles = computeAirportFlightVehiclePositions([flight], hongKongWallToInstant(2026, 7, 24, 6, 13))

    expect(vehicles).toHaveLength(1)
    expect(vehicles[0]).toMatchObject({
      id: `${flight.id}-replay`,
      type: 'flight',
      lineId: hkiaRunways[0].id,
      tripId: flight.id,
      labelEn: 'HX246 - HKIA movement replay',
      labelZh: 'HX246 - 香港國際機場移動重播',
      labelPt: 'HX246 - Repeticao de movimento HKIA',
      destinationId: null,
    })
    expect(vehicles[0].coordinates[0]).toBeGreaterThan(hkiaRunways[0].geometry[0][0])
    expect(vehicles[0].progress).toBeCloseTo(0.5, 1)
  })

  it('does not turn an outside-window historical record into a vehicle', () => {
    expect(computeAirportFlightVehiclePositions([flight], hongKongWallToInstant(2026, 7, 24, 7, 0))).toEqual([])
  })
})
