import { z } from 'zod'
import { BusRoutesSchema } from '../dataSchemas'
import type { Coordinate } from '../types'

const CitybusRouteSchema = z.object({
  co: z.literal('CTB'),
  route: z.string(),
  orig_en: z.string(),
  orig_tc: z.string(),
  dest_en: z.string(),
  dest_tc: z.string(),
})

const CitybusRouteStopSchema = z.object({
  co: z.literal('CTB'),
  route: z.string(),
  dir: z.enum(['O', 'I']),
  seq: z.coerce.number().int().positive(),
  stop: z.string(),
})

const CitybusStopSchema = z.object({
  stop: z.string(),
  name_en: z.string(),
  name_tc: z.string(),
  lat: z.coerce.number(),
  long: z.coerce.number(),
})

export interface CitybusRouteSnapshot {
  generatedAt: string
  routes: z.input<typeof CitybusRouteSchema>[]
  routeStops: z.input<typeof CitybusRouteStopSchema>[]
  stops: z.input<typeof CitybusStopSchema>[]
}

export function normalizeCitybusRoutes(snapshot: CitybusRouteSnapshot) {
  z.string().datetime({ offset: true }).parse(snapshot.generatedAt)
  const routes = z.array(CitybusRouteSchema).parse(snapshot.routes)
  const routeStops = z.array(CitybusRouteStopSchema).parse(snapshot.routeStops)
  const stops = new Map(
    z.array(CitybusStopSchema).parse(snapshot.stops)
      .map(stop => [stop.stop, [stop.long, stop.lat] as Coordinate]),
  )

  const normalized = routes.flatMap(route => ['O', 'I'].flatMap(dir => {
    const orderedStops = routeStops
      .filter(item => item.route === route.route && item.dir === dir)
      .sort((a, b) => a.seq - b.seq)
    const geometry = orderedStops
      .map(item => stops.get(item.stop))
      .filter((point): point is Coordinate => point !== undefined)

    if (orderedStops.length < 2 || geometry.length !== orderedStops.length) return []

    return [{
      id: `citybus-${route.route}-${dir.toLowerCase()}`,
      operator: 'Citybus',
      routeNumber: route.route,
      nameEn: `${route.orig_en} - ${route.dest_en}`,
      nameZh: `${route.orig_tc} - ${route.dest_tc}`,
      color: '#dc2626',
      stopIds: orderedStops.map(item => item.stop),
      geometry,
    }]
  }))

  return BusRoutesSchema.parse(normalized)
}
