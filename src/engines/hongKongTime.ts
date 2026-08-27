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
