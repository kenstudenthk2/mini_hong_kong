import { z } from 'zod'
import type { Coordinate, FerryRoute } from '../types'

const FerryFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.coerce.number(), z.coerce.number()]),
  }),
  properties: z.object({
    routeId: z.coerce.number().int().positive(),
    routeNameC: z.string(),
    routeNameE: z.string(),
    routeType: z.coerce.number().int(),
    routeSeq: z.coerce.number().int().positive(),
    stopSeq: z.coerce.number().int().positive(),
    stopId: z.coerce.number().int().positive(),
    journeyTime: z.coerce.number().nonnegative(),
  }),
})

const FerryGeoJsonSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FerryFeatureSchema),
})

interface FerryPoint {
  routeId: number
  routeNameC: string
  routeNameE: string
  routeSeq: number
  stopSeq: number
  stopId: number
  journeyTime: number
  coordinates: Coordinate
}

export function normalizeFerryGeoJson(raw: unknown): FerryRoute[] {
  const features = FerryGeoJsonSchema.parse(raw).features
    .filter(feature => feature.properties.routeType === 7)
    .map(feature => ({
      ...feature.properties,
      coordinates: feature.geometry.coordinates,
    }))

  const groups = new Map<string, FerryPoint[]>()
  for (const point of features) {
    const key = `${point.routeId}-${point.routeSeq}`
    const group = groups.get(key) ?? []
    group.push(point)
    groups.set(key, group)
  }

  return [...groups.entries()].flatMap(([key, points]) => {
    const ordered = points.sort((a, b) => a.stopSeq - b.stopSeq)
    if (ordered.length < 2) return []
    const first = ordered[0]
    return [{
      id: `ferry-${key}`,
      operator: 'Transport Department Ferry Network',
      routeNumber: String(first.routeId),
      nameEn: first.routeNameE,
      nameZh: first.routeNameC,
      color: '#0284c7',
      stopIds: ordered.map(point => String(point.stopId)),
      geometry: ordered.map(point => point.coordinates),
      journeyTimeMinutes: first.journeyTime,
    }]
  })
}
