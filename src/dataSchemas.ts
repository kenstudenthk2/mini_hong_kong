import { z } from 'zod'
import type { TransitData } from './types'

const CoordinateSchema = z.tuple([z.number(), z.number()])

export const BusRoutesSchema = z.array(z.object({
  id: z.string(),
  operator: z.string(),
  routeNumber: z.string(),
  nameEn: z.string(),
  nameZh: z.string(),
  namePt: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  stopIds: z.array(z.string()).min(2),
  geometry: z.array(CoordinateSchema).min(2),
}))

export const RailLinesSchema = z.array(z.object({
  id: z.string(),
  mode: z.enum(['mtr', 'light_rail']),
  nameEn: z.string(),
  nameZh: z.string(),
  namePt: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  operator: z.string(),
  stationIds: z.array(z.string()).min(2),
  geometry: z.array(CoordinateSchema).min(2),
}))

export const StationsSchema = z.array(z.object({
  id: z.string(),
  nameEn: z.string(),
  nameZh: z.string(),
  namePt: z.string().optional(),
  coordinates: CoordinateSchema,
  lineIds: z.array(z.string()).min(1),
}))

export const TripsSchema = z.array(z.object({
  id: z.string(),
  lineId: z.string(),
  direction: z.enum(['outbound', 'inbound']),
  scheduleType: z.enum(['weekday', 'weekend']),
  startMinutes: z.number().min(0),
  endMinutes: z.number().min(0),
  headwayMinutes: z.number().positive(),
  durationMinutes: z.number().positive(),
  dwellMinutes: z.number().min(0),
  stopIds: z.array(z.string()).min(2),
}))

export function parseData<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new Error(`${label} failed validation: ${result.error.message}`)
  }
  return result.data
}

export function validateTransitData(data: TransitData): string[] {
  const errors: string[] = []
  const lineIds = new Set<string>()
  const stationIds = new Set<string>()

  for (const line of data.railLines) {
    if (lineIds.has(line.id)) errors.push(`duplicate line id: ${line.id}`)
    lineIds.add(line.id)
    if (line.stationIds.length !== line.geometry.length) {
      errors.push(`line ${line.id} stationIds and geometry lengths differ`)
    }
  }

  for (const station of data.stations) {
    if (stationIds.has(station.id)) errors.push(`duplicate station id: ${station.id}`)
    stationIds.add(station.id)
    for (const lineId of station.lineIds) {
      if (!lineIds.has(lineId)) errors.push(`station ${station.id} references unknown line ${lineId}`)
    }
  }

  for (const line of data.railLines) {
    for (const stationId of line.stationIds) {
      if (!stationIds.has(stationId)) errors.push(`line ${line.id} references unknown station ${stationId}`)
    }
  }

  for (const trip of data.trips) {
    const line = data.railLines.find(item => item.id === trip.lineId)
    if (!line) {
      errors.push(`trip ${trip.id} references unknown line ${trip.lineId}`)
      continue
    }
    const lineStations = new Set(line.stationIds)
    for (const stopId of trip.stopIds) {
      if (!lineStations.has(stopId)) errors.push(`trip ${trip.id} stop ${stopId} is not on line ${line.id}`)
    }
    if (trip.durationMinutes <= trip.dwellMinutes * trip.stopIds.length) {
      errors.push(`trip ${trip.id} duration must exceed total dwell time`)
    }
  }

  return errors
}

export function assertValidTransitData(data: TransitData): TransitData {
  const errors = validateTransitData(data)
  if (errors.length > 0) throw new Error(`transit data contract failed: ${errors.join('; ')}`)
  return data
}
