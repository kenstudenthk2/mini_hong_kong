import type { ScheduleType } from '../types'

export const HONG_KONG_OFFSET_MS = 8 * 60 * 60 * 1000

function shifted(instant: Date): Date {
  return new Date(instant.getTime() + HONG_KONG_OFFSET_MS)
}

export function hongKongWeekday(instant: Date): number {
  return shifted(instant).getUTCDay()
}

export function hongKongMinutesOfDay(instant: Date): number {
  const hk = shifted(instant)
  return hk.getUTCHours() * 60 + hk.getUTCMinutes() + hk.getUTCSeconds() / 60
}

export function hongKongYmd(instant: Date): string {
  const hk = shifted(instant)
  const y = hk.getUTCFullYear()
  const m = String(hk.getUTCMonth() + 1).padStart(2, '0')
  const d = String(hk.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function hongKongDateTimeInputValue(instant: Date): string {
  const hk = shifted(instant)
  const date = hongKongYmd(instant)
  const hour = String(hk.getUTCHours()).padStart(2, '0')
  const minute = String(hk.getUTCMinutes()).padStart(2, '0')
  return `${date}T${hour}:${minute}`
}

export function hongKongDateTimeInputToInstant(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day, hour, minute] = match.map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const instant = hongKongWallToInstant(year, month - 1, day, hour, minute)
  return hongKongDateTimeInputValue(instant) === value ? instant : null
}

export function hongKongWallToInstant(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  return new Date(Date.UTC(year, month, day, hour, minute, second) - HONG_KONG_OFFSET_MS)
}

export function getScheduleType(instant: Date): ScheduleType {
  const day = hongKongWeekday(instant)
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

export function getOperationalScheduleType(instant: Date): ScheduleType {
  const minutes = hongKongMinutesOfDay(instant)
  const operationalInstant = minutes < 240
    ? new Date(instant.getTime() - 24 * 60 * 60 * 1000)
    : instant
  return getScheduleType(operationalInstant)
}
