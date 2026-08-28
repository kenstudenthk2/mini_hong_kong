import { z } from 'zod'
import type { FerrySchedule, ScheduleType } from '../types'

interface FerryGtfsSnapshot {
  routes: string
  trips: string
  calendar: string
  stopTimes: string
}

const RouteRow = z.object({ route_id: z.string().min(1), route_type: z.string() })
const TripRow = z.object({ route_id: z.string().min(1), service_id: z.string().min(1), trip_id: z.string().min(1) })
const CalendarRow = z.object({
  service_id: z.string().min(1),
  monday: z.string(), tuesday: z.string(), wednesday: z.string(), thursday: z.string(), friday: z.string(),
  saturday: z.string(), sunday: z.string(),
})
const StopTimeRow = z.object({
  trip_id: z.string().min(1), arrival_time: z.string(), departure_time: z.string(),
  stop_id: z.string().min(1), stop_sequence: z.string(),
})

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some(cell => cell !== '')) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }
  row.push(value)
  if (row.some(cell => cell !== '')) rows.push(row)
  const headers = (rows.shift() ?? []).map(header => header.replace(/^\uFEFF/, ''))
  return rows.map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])))
}

function parseGtfsTime(value: string): number | null {
  const match = /^(\d+):(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return Number.isInteger(minutes) && Number(match[3]) < 60 ? minutes : null
}

function serviceTypes(calendar: z.infer<typeof CalendarRow>): ScheduleType[] {
  const weekday = [calendar.monday, calendar.tuesday, calendar.wednesday, calendar.thursday, calendar.friday].some(day => day === '1')
  const weekend = [calendar.saturday, calendar.sunday].some(day => day === '1')
  return [weekday ? 'weekday' : null, weekend ? 'weekend' : null].filter((type): type is ScheduleType => type !== null)
}

export function normalizeFerryGtfsSchedules(snapshot: FerryGtfsSnapshot): FerrySchedule[] {
  const ferryRouteIds = new Set(
    parseCsv(snapshot.routes)
      .map(row => RouteRow.safeParse(row))
      .filter((result): result is { success: true; data: z.infer<typeof RouteRow> } => result.success)
      .filter(result => result.data.route_type === '4')
      .map(result => result.data.route_id),
  )
  const calendars = new Map(
    parseCsv(snapshot.calendar)
      .map(row => CalendarRow.safeParse(row))
      .filter((result): result is { success: true; data: z.infer<typeof CalendarRow> } => result.success)
      .map(result => [result.data.service_id, serviceTypes(result.data)]),
  )
  const stopTimes = new Map<string, z.infer<typeof StopTimeRow>[]>()
  for (const result of parseCsv(snapshot.stopTimes).map(row => StopTimeRow.safeParse(row))) {
    if (!result.success) continue
    const rows = stopTimes.get(result.data.trip_id) ?? []
    rows.push(result.data)
    stopTimes.set(result.data.trip_id, rows)
  }

  const schedules: FerrySchedule[] = []
  for (const result of parseCsv(snapshot.trips).map(row => TripRow.safeParse(row))) {
    if (!result.success || !ferryRouteIds.has(result.data.route_id)) continue
    const direction = result.data.trip_id.match(/^[^-]+-(\d+)-/)?.[1]
    if (!direction) continue
    const rows = [...(stopTimes.get(result.data.trip_id) ?? [])]
      .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
    const first = rows[0]
    const last = rows[rows.length - 1]
    const startMinutes = first ? parseGtfsTime(first.departure_time) : null
    const endMinutes = last ? parseGtfsTime(last.arrival_time) : null
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes || rows.length < 2) continue
    for (const scheduleType of calendars.get(result.data.service_id) ?? []) {
      schedules.push({
        id: `${result.data.trip_id}-${scheduleType}`,
        routeId: `ferry-${result.data.route_id}-${direction}`,
        scheduleType,
        startMinutes,
        endMinutes: startMinutes,
        headwayMinutes: 1,
        durationMinutes: endMinutes - startMinutes,
        dwellMinutes: 0,
      })
    }
  }
  return schedules
}

export type { FerryGtfsSnapshot }
