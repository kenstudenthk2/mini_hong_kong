import { z } from 'zod'
import { BusRoutesSchema } from '../dataSchemas'
import type { BusArrival, Coordinate } from '../types'

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

const CitybusEtaRecordSchema = z.object({
  co: z.literal('CTB'),
  route: z.string(),
  dir: z.enum(['O', 'I']),
  seq: z.coerce.number().int().positive(),
  stop: z.string(),
  dest_en: z.string(),
  dest_tc: z.string(),
  eta_seq: z.coerce.number().int().positive(),
  eta: z.string(),
  rmk_en: z.string().optional(),
  data_timestamp: z.string().datetime({ offset: true }),
})

export interface CitybusRouteSnapshot {
  generatedAt: string
  routes: z.input<typeof CitybusRouteSchema>[]
  routeStops: z.input<typeof CitybusRouteStopSchema>[]
  stops: z.input<typeof CitybusStopSchema>[]
}

// Keep the initial live integration bounded while each route requires two API calls and many stop lookups.
export const citybusFeaturedRouteNumbers = ['1', '10', '101', '102', '118', '260', '969', 'A11'] as const

export function selectCitybusRoutes(routes: CitybusRouteSnapshot['routes']) {
  const byNumber = new Map(routes.map(route => [route.route, route]))
  return citybusFeaturedRouteNumbers
    .map(routeNumber => byNumber.get(routeNumber))
    .filter((route): route is CitybusRouteSnapshot['routes'][number] => route !== undefined)
}

export function normalizeCitybusEta(raw: unknown): BusArrival[] {
  const envelope = z.object({
    generated_timestamp: z.string().datetime({ offset: true }),
    data: z.array(CitybusEtaRecordSchema),
  }).parse(raw)

  return envelope.data
    .filter(record => record.eta !== '')
    .map(record => {
      const routeId = `citybus-${record.route}-${record.dir.toLowerCase()}`
      return {
        id: `${routeId}-eta-${record.seq}-${record.eta_seq}`,
        routeId,
        stopSequence: record.seq,
        arrivalSequence: record.eta_seq,
        destinationEn: record.dest_en,
        destinationZh: record.dest_tc,
        eta: record.eta,
        remarkEn: record.rmk_en ?? '',
        dataTimestamp: record.data_timestamp,
      }
    })
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
