import type { Coordinate } from '../types'

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function distanceKm(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearing(a: Coordinate, b: Coordinate): number {
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const dLon = toRad(b[0] - a[0])
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function interpolateOnLine(coords: Coordinate[], progress: number): { coordinates: Coordinate; bearing: number } {
  if (coords.length === 0) return { coordinates: [0, 0], bearing: 0 }
  if (coords.length === 1) return { coordinates: coords[0], bearing: 0 }

  const clamped = Math.min(1, Math.max(0, progress))
  const segmentLengths = coords.slice(0, -1).map((coord, index) => distanceKm(coord, coords[index + 1]))
  const total = segmentLengths.reduce((sum, len) => sum + len, 0)
  if (total === 0) return { coordinates: coords[0], bearing: 0 }

  let target = total * clamped
  for (let i = 0; i < segmentLengths.length; i += 1) {
    const len = segmentLengths[i]
    if (target <= len || i === segmentLengths.length - 1) {
      const ratio = len === 0 ? 0 : target / len
      const a = coords[i]
      const b = coords[i + 1]
      return {
        coordinates: [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio],
        bearing: bearing(a, b),
      }
    }
    target -= len
  }

  return { coordinates: coords[coords.length - 1], bearing: bearing(coords[coords.length - 2], coords[coords.length - 1]) }
}

export function cumulativeProgressAtIndex(coords: Coordinate[], index: number): number {
  if (coords.length <= 1) return 0
  const segmentLengths = coords.slice(0, -1).map((coord, i) => distanceKm(coord, coords[i + 1]))
  const total = segmentLengths.reduce((sum, len) => sum + len, 0)
  if (total === 0) return 0
  const before = segmentLengths.slice(0, Math.max(0, index)).reduce((sum, len) => sum + len, 0)
  return Math.min(1, Math.max(0, before / total))
}
