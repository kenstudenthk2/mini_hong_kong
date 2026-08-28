import type { BusRoute, BusArrival, BusSchedule, FerryRoute, FerrySchedule, RailLine, Station, TransitData, TramRoute, TramSchedule, Trip, VehiclePosition } from '../types'
import { getOperationalScheduleType, getScheduleType, hongKongMinutesOfDay } from './hongKongTime'
import { bearing, cumulativeProgressAtIndex, interpolateOnLine } from './geometry'

function wrapServiceEnd(endMinutes: number): number {
  return endMinutes < 1440 ? endMinutes : endMinutes
}

function adjustedNowMinutes(
  trip: Pick<Trip, 'startMinutes' | 'endMinutes' | 'durationMinutes'>,
  nowMinutes: number,
): number {
  const crossesMidnight = trip.endMinutes >= 1440
    || (trip.startMinutes === trip.endMinutes && trip.startMinutes + trip.durationMinutes >= 1440)
  return nowMinutes < trip.startMinutes && crossesMidnight ? nowMinutes + 1440 : nowMinutes
}

function activeStarts(trip: Pick<Trip, 'startMinutes' | 'endMinutes' | 'headwayMinutes' | 'durationMinutes'>, nowMinutes: number): number[] {
  const starts: number[] = []
  if (trip.startMinutes === trip.endMinutes) {
    const adjustedNow = adjustedNowMinutes(trip, nowMinutes)
    return adjustedNow >= trip.startMinutes && adjustedNow <= trip.startMinutes + trip.durationMinutes
      ? [trip.startMinutes]
      : starts
  }
  const end = wrapServiceEnd(trip.endMinutes)
  for (let start = trip.startMinutes; start <= end; start += trip.headwayMinutes) {
    const normalizedNow = nowMinutes < trip.startMinutes && end >= 1440 ? nowMinutes + 1440 : nowMinutes
    if (normalizedNow >= start && normalizedNow <= start + trip.durationMinutes) {
      starts.push(start)
    }
  }
  return starts
}

interface TripPosition {
  coordinates: [number, number]
  bearing: number
  progress: number
  nextStopId: string | null
}

function orientedLine(line: RailLine, trip: Trip): { stationIds: string[]; geometry: RailLine['geometry'] } {
  if (trip.direction === 'inbound') {
    return { stationIds: [...line.stationIds].reverse(), geometry: [...line.geometry].reverse() }
  }
  return { stationIds: line.stationIds, geometry: line.geometry }
}

function stationIndex(stationIds: string[], stopId: string): number {
  return stationIds.findIndex(id => id === stopId)
}

function stationPoint(line: ReturnType<typeof orientedLine>, stopId: string): [number, number] | null {
  const index = stationIndex(line.stationIds, stopId)
  return index >= 0 ? line.geometry[index] : null
}

function segmentGeometry(line: ReturnType<typeof orientedLine>, fromStopId: string, toStopId: string): [number, number][] {
  const from = stationIndex(line.stationIds, fromStopId)
  const to = stationIndex(line.stationIds, toStopId)
  if (from < 0 || to < 0) return []
  const start = Math.min(from, to)
  const end = Math.max(from, to)
  const slice = line.geometry.slice(start, end + 1)
  return from <= to ? slice : slice.reverse()
}

function positionFromElapsed(line: ReturnType<typeof orientedLine>, trip: Trip, elapsed: number): TripPosition {
  if (trip.stopIds.length <= 1) {
    const coordinates = stationPoint(line, trip.stopIds[0]) ?? line.geometry[0] ?? [0, 0]
    return { coordinates, bearing: 0, progress: 0, nextStopId: trip.stopIds[0] ?? null }
  }
  const segmentCount = trip.stopIds.length - 1
  const dwellTotal = trip.dwellMinutes * trip.stopIds.length
  const travelTotal = Math.max(1, trip.durationMinutes - dwellTotal)
  const segmentTravel = travelTotal / segmentCount
  let cursor = 0

  for (let stopIndex = 0; stopIndex < trip.stopIds.length; stopIndex += 1) {
    const stopId = trip.stopIds[stopIndex]
    const dwellEnd = cursor + trip.dwellMinutes
    if (elapsed <= dwellEnd) {
      const coordinates = stationPoint(line, stopId) ?? line.geometry[0] ?? [0, 0]
      const nextStopId = trip.stopIds[Math.min(stopIndex + 1, trip.stopIds.length - 1)] ?? null
      const nextPoint = nextStopId ? stationPoint(line, nextStopId) : null
      return {
        coordinates,
        bearing: nextPoint ? bearing(coordinates, nextPoint) : 0,
        progress: cumulativeProgressAtIndex(line.geometry, stationIndex(line.stationIds, stopId)),
        nextStopId,
      }
    }
    cursor = dwellEnd
    if (stopIndex < segmentCount) {
      const travelEnd = cursor + segmentTravel
      if (elapsed <= travelEnd) {
        const segmentRatio = (elapsed - cursor) / segmentTravel
        const fromStopId = trip.stopIds[stopIndex]
        const toStopId = trip.stopIds[stopIndex + 1]
        const segment = segmentGeometry(line, fromStopId, toStopId)
        const position = interpolateOnLine(segment, segmentRatio)
        const fromIndex = stationIndex(line.stationIds, fromStopId)
        const toIndex = stationIndex(line.stationIds, toStopId)
        const fromProgress = cumulativeProgressAtIndex(line.geometry, fromIndex)
        const toProgress = cumulativeProgressAtIndex(line.geometry, toIndex)
        return {
          ...position,
          progress: fromProgress + (toProgress - fromProgress) * segmentRatio,
          nextStopId: toStopId ?? null,
        }
      }
      cursor = travelEnd
    }
  }

  const finalStop = trip.stopIds[trip.stopIds.length - 1]
  const coordinates = stationPoint(line, finalStop) ?? line.geometry[line.geometry.length - 1] ?? [0, 0]
  return { coordinates, bearing: 0, progress: 1, nextStopId: null }
}

function destinationForTrip(trip: Trip): string | null {
  return trip.stopIds[trip.stopIds.length - 1] ?? null
}

function stationById(stations: Station[]): Map<string, Station> {
  return new Map(stations.map(station => [station.id, station]))
}

export function computeVehiclePositions(transitData: TransitData, time: Date): VehiclePosition[] {
  const scheduleType = getOperationalScheduleType(time)
  const nowMinutes = hongKongMinutesOfDay(time)
  const lines = new Map(transitData.railLines.map(line => [line.id, line]))
  const stations = stationById(transitData.stations)
  const vehicles: VehiclePosition[] = []

  for (const trip of transitData.trips) {
    if (trip.scheduleType !== scheduleType) continue
    const line = lines.get(trip.lineId)
    if (!line) continue
    for (const start of activeStarts(trip, nowMinutes)) {
    const adjustedNow = adjustedNowMinutes(trip, nowMinutes)
      const elapsed = adjustedNow - start
      const tripLine = orientedLine(line, trip)
      const tripPosition = positionFromElapsed(tripLine, trip, elapsed)
      const destinationId = destinationForTrip(trip)
      const destination = destinationId ? stations.get(destinationId) : undefined
      vehicles.push({
        id: `${trip.id}-${start}`,
        type: line.mode,
        lineId: line.id,
        tripId: trip.id,
        color: line.color,
        coordinates: tripPosition.coordinates,
        bearing: tripPosition.bearing,
        progress: tripPosition.progress,
        labelEn: line.nameEn,
        labelZh: line.nameZh,
        labelPt: line.namePt || line.nameEn,
        nextStopId: tripPosition.nextStopId,
        destinationId: destination?.id ?? null,
      })
    }
  }

  return vehicles
}

function scheduledRoutePositionFromElapsed(
  route: Pick<BusRoute | FerryRoute, 'stopIds' | 'geometry'>,
  schedule: Pick<BusSchedule | FerrySchedule, 'dwellMinutes' | 'durationMinutes'>,
  elapsed: number,
): TripPosition {
  const stopCount = route.stopIds.length
  if (stopCount <= 1) {
    return { coordinates: route.geometry[0] ?? [0, 0], bearing: 0, progress: 0, nextStopId: route.stopIds[0] ?? null }
  }

  const dwellTotal = schedule.dwellMinutes * stopCount
  const travelTotal = Math.max(1, schedule.durationMinutes - dwellTotal)
  const segmentTravel = travelTotal / (stopCount - 1)
  let cursor = 0

  for (let stopIndex = 0; stopIndex < stopCount; stopIndex += 1) {
    const dwellEnd = cursor + schedule.dwellMinutes
    if (elapsed <= dwellEnd) {
      const coordinates = route.geometry[stopIndex] ?? route.geometry[0] ?? [0, 0]
      const nextStopId = route.stopIds[Math.min(stopIndex + 1, stopCount - 1)] ?? null
      const nextPoint = route.geometry[stopIndex + 1]
      return {
        coordinates,
        bearing: nextPoint ? bearing(coordinates, nextPoint) : 0,
        progress: stopIndex / (stopCount - 1),
        nextStopId,
      }
    }
    cursor = dwellEnd
    if (stopIndex < stopCount - 1) {
      const travelEnd = cursor + segmentTravel
      if (elapsed <= travelEnd) {
        const ratio = (elapsed - cursor) / segmentTravel
        const segment = route.geometry.slice(stopIndex, stopIndex + 2)
        const position = interpolateOnLine(segment, ratio)
        return {
          ...position,
          progress: (stopIndex + ratio) / (stopCount - 1),
          nextStopId: route.stopIds[stopIndex + 1] ?? null,
        }
      }
      cursor = travelEnd
    }
  }

  return {
    coordinates: route.geometry[route.geometry.length - 1] ?? [0, 0],
    bearing: 0,
    progress: 1,
    nextStopId: null,
  }
}

export function computeBusVehiclePositions(routes: BusRoute[], schedules: BusSchedule[], time: Date): VehiclePosition[] {
  const scheduleType = getOperationalScheduleType(time)
  const nowMinutes = hongKongMinutesOfDay(time)
  const routeById = new Map(routes.map(route => [route.id, route]))
  const vehicles: VehiclePosition[] = []

  for (const schedule of schedules) {
    if (schedule.scheduleType !== scheduleType) continue
    const route = routeById.get(schedule.routeId)
    if (!route) continue
    for (const start of activeStarts(schedule, nowMinutes)) {
      const adjustedNow = adjustedNowMinutes(schedule, nowMinutes)
      const position = scheduledRoutePositionFromElapsed(route, schedule, adjustedNow - start)
      vehicles.push({
        id: `${schedule.id}-${start}`,
        type: 'bus',
        lineId: route.id,
        tripId: schedule.id,
        color: route.color,
        coordinates: position.coordinates,
        bearing: position.bearing,
        progress: position.progress,
        labelEn: route.nameEn,
        labelZh: route.nameZh,
        labelPt: route.namePt || route.nameEn,
        nextStopId: position.nextStopId,
        destinationId: route.stopIds[route.stopIds.length - 1] ?? null,
      })
    }
  }

  return vehicles
}

export function computeFerryVehiclePositions(routes: FerryRoute[], schedules: FerrySchedule[], time: Date): VehiclePosition[] {
  const scheduleType = getOperationalScheduleType(time)
  const nowMinutes = hongKongMinutesOfDay(time)
  const routeById = new Map(routes.map(route => [route.id, route]))
  const vehicles: VehiclePosition[] = []

  for (const schedule of schedules) {
    if (schedule.scheduleType !== scheduleType) continue
    const route = routeById.get(schedule.routeId)
    if (!route) continue
    for (const start of activeStarts(schedule, nowMinutes)) {
      const adjustedNow = adjustedNowMinutes(schedule, nowMinutes)
      const position = scheduledRoutePositionFromElapsed(route, schedule, adjustedNow - start)
      vehicles.push({
        id: `${schedule.id}-${start}`,
        type: 'ferry',
        lineId: route.id,
        tripId: schedule.id,
        color: route.color,
        coordinates: position.coordinates,
        bearing: position.bearing,
        progress: position.progress,
        labelEn: route.nameEn,
        labelZh: route.nameZh,
        labelPt: route.namePt || route.nameEn,
        nextStopId: position.nextStopId,
        destinationId: route.stopIds[route.stopIds.length - 1] ?? null,
      })
    }
  }

  return vehicles
}

export function computeTramVehiclePositions(routes: TramRoute[], schedules: TramSchedule[], time: Date): VehiclePosition[] {
  const scheduleType = getOperationalScheduleType(time)
  const nowMinutes = hongKongMinutesOfDay(time)
  const routeById = new Map(routes.map(route => [route.id, route]))
  const vehicles: VehiclePosition[] = []

  for (const schedule of schedules) {
    if (schedule.scheduleType !== scheduleType) continue
    const route = routeById.get(schedule.routeId)
    if (!route) continue
    for (const start of activeStarts(schedule, nowMinutes)) {
      const adjustedNow = adjustedNowMinutes(schedule, nowMinutes)
      const position = scheduledRoutePositionFromElapsed(route, schedule, adjustedNow - start)
      vehicles.push({
        id: `${schedule.id}-${start}`,
        type: 'tram',
        lineId: route.id,
        tripId: schedule.id,
        color: route.color,
        coordinates: position.coordinates,
        bearing: position.bearing,
        progress: position.progress,
        labelEn: route.nameEn,
        labelZh: route.nameZh,
        labelPt: route.namePt || route.nameEn,
        nextStopId: position.nextStopId,
        destinationId: route.stopIds[route.stopIds.length - 1] ?? null,
      })
    }
  }

  return vehicles
}

export function computeBusVehiclePositionsFromEta(routes: BusRoute[], arrivals: BusArrival[], time: Date): VehiclePosition[] {
  const routeById = new Map(routes.map(route => [route.id, route]))
  const groups = new Map<string, BusArrival[]>()
  for (const arrival of arrivals) {
    const key = `${arrival.routeId}|${arrival.destinationEn}|${arrival.arrivalSequence}`
    const group = groups.get(key) ?? []
    group.push(arrival)
    groups.set(key, group)
  }

  const now = time.getTime()
  const vehicles: VehiclePosition[] = []
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => a.stopSequence - b.stopSequence)
    const route = routeById.get(ordered[0]?.routeId ?? '')
    if (!route) continue

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const from = ordered[index]
      const to = ordered[index + 1]
      if (to.stopSequence !== from.stopSequence + 1) continue
      const fromTime = Date.parse(from.eta)
      const toTime = Date.parse(to.eta)
      if (now < fromTime || now > toTime || toTime <= fromTime) continue
      const fromIndex = from.stopSequence - 1
      const toIndex = to.stopSequence - 1
      const segment = route.geometry.slice(fromIndex, toIndex + 1)
      if (segment.length < 2) continue
      const ratio = (now - fromTime) / (toTime - fromTime)
      const position = interpolateOnLine(segment, ratio)
      vehicles.push({
        id: `${route.id}-eta-${from.arrivalSequence}`,
        type: 'bus',
        lineId: route.id,
        tripId: `${route.id}-eta-${from.arrivalSequence}`,
        color: route.color,
        coordinates: position.coordinates,
        bearing: position.bearing,
        progress: (fromIndex + ratio) / Math.max(route.stopIds.length - 1, 1),
        labelEn: route.nameEn,
        labelZh: route.nameZh,
        labelPt: route.namePt || route.nameEn,
        nextStopId: route.stopIds[toIndex] ?? null,
        destinationId: route.stopIds[route.stopIds.length - 1] ?? null,
      })
      break
    }
  }

  return vehicles
}

export { getScheduleType, hongKongMinutesOfDay }
