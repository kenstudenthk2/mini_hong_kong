import { z } from 'zod'
import { BusRoutesSchema } from '../dataSchemas'
import type { Coordinate } from '../types'

const GmbDirectionSchema = z.object({
  route_seq: z.coerce.number().int().positive(),
  orig_tc: z.string().min(1),
  orig_en: z.string().min(1),
  dest_tc: z.string().min(1),
  dest_en: z.string().min(1),
})

const GmbRouteSchema = z.object({
  route_id: z.coerce.number().int().positive(),
  region: z.string().min(1),
  route_code: z.string().min(1),
  directions: z.array(GmbDirectionSchema),
})

const GmbRouteStopSchema = z.object({
  stop_seq: z.coerce.number().int().positive(),
  stop_id: z.coerce.number().int().positive(),
  name_tc: z.string().min(1),
  name_en: z.string().min(1),
})

const GmbStopSchema = z.object({
  coordinates: z.object({
    wgs84: z.object({
      latitude: z.coerce.number().finite(),
      longitude: z.coerce.number().finite(),
    }),
  }),
})

export interface GmbRouteSnapshot {
  routes: z.input<typeof GmbRouteSchema>[]
  routeStopsByDirection: Record<string, z.input<typeof GmbRouteStopSchema>[]>
  stopsById: Record<string, z.input<typeof GmbStopSchema>>
}

export function normalizeGmbRoutes(snapshot: GmbRouteSnapshot) {
  const routes = z.array(GmbRouteSchema).parse(snapshot.routes)
  const normalized = routes.flatMap(route => route.directions.flatMap(direction => {
    const key = `${route.route_id}-${direction.route_seq}`
    const routeStops = z.array(GmbRouteStopSchema).parse(snapshot.routeStopsByDirection[key] ?? [])
      .sort((a, b) => a.stop_seq - b.stop_seq)
    const geometry = routeStops.map(routeStop => {
      const stop = snapshot.stopsById[String(routeStop.stop_id)]
      if (!stop) return undefined
      const parsed = GmbStopSchema.parse(stop)
      return [parsed.coordinates.wgs84.longitude, parsed.coordinates.wgs84.latitude] as Coordinate
    })

    if (routeStops.length < 2 || geometry.some(point => point === undefined)) return []

    return [{
      id: `gmb-${route.region.toLowerCase()}-${route.route_id}-${direction.route_seq}`,
      operator: 'GMB',
      routeNumber: route.route_code,
      nameEn: `${direction.orig_en} - ${direction.dest_en}`,
      nameZh: `${direction.orig_tc} - ${direction.dest_tc}`,
      color: '#14b8a6',
      stopIds: routeStops.map(stop => String(stop.stop_id)),
      geometry: geometry as Coordinate[],
    }]
  }))

  return BusRoutesSchema.parse(normalized)
}
