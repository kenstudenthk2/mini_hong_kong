import { hkiaRunways } from './airport'
import { bearing, interpolateOnLine } from '../engines/geometry'
import { hongKongMinutesOfDay } from '../engines/hongKongTime'
import type { AirportFlight, VehiclePosition } from '../types'

const MOVEMENT_DURATION_MINUTES = 6

function scheduledMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function elapsedSinceScheduled(nowMinutes: number, scheduled: number): number {
  const direct = nowMinutes - scheduled
  if (direct < -720) return direct + 1440
  if (direct > 720) return direct - 1440
  return direct
}

function runwayForFlight(flight: AirportFlight) {
  return hkiaRunways[flight.sequence % hkiaRunways.length] ?? hkiaRunways[0]
}

export function computeAirportFlightVehiclePositions(flights: AirportFlight[], time: Date): VehiclePosition[] {
  const nowMinutes = hongKongMinutesOfDay(time)
  return flights.flatMap(flight => {
    const scheduled = scheduledMinutes(flight.scheduledTime)
    if (scheduled === null) return []
    const elapsed = elapsedSinceScheduled(nowMinutes, scheduled)
    if (elapsed < 0 || elapsed > MOVEMENT_DURATION_MINUTES) return []

    const runway = runwayForFlight(flight)
    const movementProgress = elapsed / MOVEMENT_DURATION_MINUTES
    const progress = flight.direction === 'arrival' ? 1 - movementProgress : movementProgress
    const position = interpolateOnLine(runway.geometry, progress)
    const flightRef = flight.flightNumbers.join(' / ') || flight.id
    const labelEn = `${flightRef} - HKIA movement replay`
    const labelZh = `${flightRef} - \u9999\u6e2f\u570b\u969b\u6a5f\u5834\u79fb\u52d5\u91cd\u64ad`
    const labelPt = `${flightRef} - Repeticao de movimento HKIA`
    const first = runway.geometry[0]
    const last = runway.geometry[runway.geometry.length - 1]
    const movementBearing = flight.direction === 'arrival' ? bearing(last, first) : bearing(first, last)
    return [{
      id: `${flight.id}-replay`,
      type: 'flight',
      lineId: runway.id,
      tripId: flight.id,
      color: '#f97316',
      coordinates: position.coordinates,
      bearing: movementBearing,
      progress,
      labelEn,
      labelZh,
      labelPt,
      nextStopId: null,
      destinationId: null,
    }]
  })
}
