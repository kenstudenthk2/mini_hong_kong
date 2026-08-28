import { z } from 'zod'
import { BusRoutesSchema } from '../dataSchemas'
import type { BusSchedule, Coordinate } from '../types'

const KmbRouteSchema = z.object({
  route: z.string(),
  bound: z.enum(['O', 'I']),
  service_type: z.string(),
  orig_en: z.string(),
  orig_tc: z.string(),
  dest_en: z.string(),
  dest_tc: z.string(),
})

const KmbRouteStopSchema = z.object({
  route: z.string(),
  bound: z.enum(['O', 'I']),
  service_type: z.string(),
  seq: z.coerce.number().int().positive(),
  stop: z.string(),
})

const KmbStopSchema = z.object({
  stop: z.string(),
  lat: z.coerce.number(),
  long: z.coerce.number(),
})

const KmbEtaRecordSchema = z.object({
  co: z.string(),
  route: z.string(),
  dir: z.enum(['O', 'I']),
  service_type: z.coerce.number().int().positive(),
  seq: z.coerce.number().int().positive(),
  dest_tc: z.string(),
  dest_en: z.string(),
  eta_seq: z.coerce.number().int().positive(),
  eta: z.string().datetime({ offset: true }),
  rmk_en: z.string().optional(),
  data_timestamp: z.string().datetime({ offset: true }),
})

const KmbEnvelope = <T extends z.ZodType>(item: T) => z.object({
  type: z.string(),
  version: z.string(),
  generated_timestamp: z.string().datetime({ offset: true }),
  data: z.array(item),
})

export interface KmbRouteSnapshot {
  generatedAt: string
  routes: z.input<typeof KmbRouteSchema>[]
  routeStops: z.input<typeof KmbRouteStopSchema>[]
  stops: z.input<typeof KmbStopSchema>[]
}

// KMB's route feed does not publish headways; this is a clearly labelled replay scaffold.
export const kmbReplaySchedules: BusSchedule[] = [{
  id: 'kmb-1-o-1-replay',
  routeId: 'kmb-1-o-1',
  scheduleType: 'weekday',
  startMinutes: 360,
  endMinutes: 1380,
  headwayMinutes: 10,
  durationMinutes: 90,
  dwellMinutes: 1,
}]

export interface KmbArrival {
  id: string
  routeId: string
  stopSequence: number
  destinationEn: string
  destinationZh: string
  eta: string
  remarkEn: string
  dataTimestamp: string
}

export function normalizeKmbEta(raw: unknown): KmbArrival[] {
  const envelope = z.object({
    generated_timestamp: z.string().datetime({ offset: true }),
    data: z.array(KmbEtaRecordSchema),
  }).parse(raw)

  return envelope.data.map(record => {
    const routeId = `kmb-${record.route}-${record.dir}-${record.service_type}`.toLowerCase()
    return {
      id: `${routeId}-eta-${record.seq}-${record.eta_seq}`,
      routeId,
      stopSequence: record.seq,
      destinationEn: record.dest_en,
      destinationZh: record.dest_tc,
      eta: record.eta,
      remarkEn: record.rmk_en ?? '',
      dataTimestamp: record.data_timestamp,
    }
  })
}

export function normalizeKmbRoutes(snapshot: KmbRouteSnapshot) {
  const routes = KmbEnvelope(KmbRouteSchema).parse({
    type: 'RouteList',
    version: '1.0',
    generated_timestamp: snapshot.generatedAt,
    data: snapshot.routes,
  })
  const routeStops = KmbEnvelope(KmbRouteStopSchema).parse({
    type: 'RouteStopList',
    version: '1.0',
    generated_timestamp: snapshot.generatedAt,
    data: snapshot.routeStops,
  })
  const stops = new Map(
    KmbEnvelope(KmbStopSchema).parse({
      type: 'StopList',
      version: '1.0',
      generated_timestamp: snapshot.generatedAt,
      data: snapshot.stops,
    }).data.map(stop => [stop.stop, [stop.long, stop.lat] as Coordinate]),
  )

  const normalized = routes.data.map(route => {
    const key = `${route.route}|${route.bound}|${route.service_type}`
    const orderedStops = routeStops.data
      .filter(item => `${item.route}|${item.bound}|${item.service_type}` === key)
      .sort((a, b) => a.seq - b.seq)
    const geometry = orderedStops.map(item => stops.get(item.stop)).filter((point): point is Coordinate => point !== undefined)

    if (orderedStops.length < 2 || geometry.length !== orderedStops.length) return null

    return {
      id: `kmb-${route.route}-${route.bound}-${route.service_type}`.toLowerCase(),
      operator: 'KMB/LWB',
      routeNumber: route.route,
      nameEn: `${route.orig_en} - ${route.dest_en}`,
      nameZh: `${route.orig_tc} - ${route.dest_tc}`,
      color: '#0f766e',
      stopIds: orderedStops.map(item => item.stop),
      geometry,
    }
  }).filter((route): route is NonNullable<typeof route> => route !== null)

  return BusRoutesSchema.parse(normalized)
}
