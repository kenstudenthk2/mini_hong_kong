import { z } from 'zod'
import { BusRoutesSchema } from '../dataSchemas'
import type { BusArrival, Coordinate } from '../types'

export const gmbFeaturedRegion = 'HKI'
export const gmbFeaturedRouteCode = '1'
export const gmbStopLimit = 6

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

const GmbEtaSchema = z.object({
  eta_seq: z.coerce.number().int().positive(),
  timestamp: z.string().min(1),
  remarks_en: z.string().optional().default(''),
  remarks_tc: z.string().optional().default(''),
})

const GmbEtaRouteSchema = z.object({
  enabled: z.boolean(),
  eta: z.array(GmbEtaSchema).optional().default([]),
})

const GmbEtaResponseSchema = z.object({
  generated_timestamp: z.string().min(1),
  data: z.array(GmbEtaRouteSchema),
})

export interface GmbRouteSnapshot {
  routes: z.input<typeof GmbRouteSchema>[]
  routeStopsByDirection: Record<string, z.input<typeof GmbRouteStopSchema>[]>
  stopsById: Record<string, z.input<typeof GmbStopSchema>>
}

export interface GmbRuntimeFeed {
  routes: ReturnType<typeof normalizeGmbRoutes>
  busArrivals: BusArrival[]
}

function validTimestamp(value: string): string | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function normalizeGmbEta(
  raw: unknown,
  context: { routeId: string; stopSequence: number; destinationEn: string; destinationZh: string },
): BusArrival[] {
  const payload = GmbEtaResponseSchema.parse(raw)
  const dataTimestamp = validTimestamp(payload.generated_timestamp) ?? ''
  return payload.data.flatMap(record => {
    if (!record.enabled) return []
    return record.eta.flatMap(etaRecord => {
      const eta = validTimestamp(etaRecord.timestamp)
      if (!eta) return []
      return [{
        id: `${context.routeId}-eta-${context.stopSequence}-${etaRecord.eta_seq}`,
        routeId: context.routeId,
        stopSequence: context.stopSequence,
        arrivalSequence: etaRecord.eta_seq,
        destinationEn: context.destinationEn,
        destinationZh: context.destinationZh,
        eta,
        remarkEn: etaRecord.remarks_en,
        dataTimestamp,
      }]
    })
  })
}

type JsonLoader = (path: string) => Promise<unknown>

function unwrapData(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !('data' in value)) return value
  return (value as { data: unknown }).data
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

export async function loadGmbRoutes(loadJson: JsonLoader): Promise<ReturnType<typeof normalizeGmbRoutes>> {
  const { snapshot } = await loadGmbSnapshot(loadJson)
  return normalizeGmbRoutes(snapshot)
}

async function loadGmbSnapshot(loadJson: JsonLoader): Promise<{ snapshot: GmbRouteSnapshot; route: GmbRouteSnapshot['routes'][number] }> {
  const routeResponse = await loadJson(`https://data.etagmb.gov.hk/route/${gmbFeaturedRegion}/${gmbFeaturedRouteCode}`) as { data?: unknown }
  const routeData = unwrapData(routeResponse)
  const route = (Array.isArray(routeData) ? routeData[0] : routeData) as GmbRouteSnapshot['routes'][number]
  const directions = route.directions
  const routeStopEntries = await mapWithConcurrency(directions, 2, async direction => {
    const response = await loadJson(`https://data.etagmb.gov.hk/route-stop/${route.route_id}/${direction.route_seq}`) as { data?: unknown }
    const stops = unwrapData(response)
    return [direction.route_seq, (Array.isArray(stops) ? stops : []).slice(0, gmbStopLimit)] as const
  })
  const routeStopsByDirection = Object.fromEntries(routeStopEntries)
  const stopIds = [...new Set(routeStopEntries.flatMap(([, stops]) => stops.map(stop => String((stop as { stop_id: number }).stop_id))))]
  const stopEntries = await mapWithConcurrency(stopIds, 2, async stopId => {
    const response = await loadJson(`https://data.etagmb.gov.hk/stop/${stopId}`)
    return [stopId, unwrapData(response)] as const
  })

  return {
    route,
    snapshot: {
    routes: [route as GmbRouteSnapshot['routes'][number]],
    routeStopsByDirection: Object.fromEntries(Object.entries(routeStopsByDirection).map(([sequence, stops]) => [`${route.route_id}-${sequence}`, stops as GmbRouteSnapshot['routeStopsByDirection'][string]])),
    stopsById: Object.fromEntries(stopEntries) as GmbRouteSnapshot['stopsById'],
    },
  }
}

export async function loadGmbFeed(loadJson: JsonLoader): Promise<GmbRuntimeFeed> {
  const { snapshot, route } = await loadGmbSnapshot(loadJson)
  const etaTargets = route.directions.flatMap(direction => {
    const routeId = `gmb-${route.region.toLowerCase()}-${route.route_id}-${direction.route_seq}`
    const routeStops = snapshot.routeStopsByDirection[`${route.route_id}-${direction.route_seq}`] ?? []
    return routeStops.map(stop => ({
      routeId,
      routeSeq: direction.route_seq,
      stopSeq: Number(stop.stop_seq),
      destinationEn: direction.dest_en,
      destinationZh: direction.dest_tc,
    }))
  })
  const arrivals = await mapWithConcurrency(etaTargets, 2, async target => {
    try {
      const raw = await loadJson(`https://data.etagmb.gov.hk/eta/route-stop/${route.route_id}/${target.routeSeq}/${target.stopSeq}`)
      return normalizeGmbEta(raw, {
        routeId: target.routeId,
        stopSequence: target.stopSeq,
        destinationEn: target.destinationEn,
        destinationZh: target.destinationZh,
      })
    } catch {
      return []
    }
  })
  return { routes: normalizeGmbRoutes(snapshot), busArrivals: arrivals.flat() }
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
