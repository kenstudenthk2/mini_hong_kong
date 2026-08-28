import { z } from 'zod'
import { BusRoutesSchema } from '../dataSchemas'
import type { Coordinate } from '../types'

const NlbRouteSchema = z.object({
  routeId: z.string().min(1),
  routeNo: z.string().min(1),
  routeName_c: z.string().min(1),
  routeName_e: z.string().min(1),
})

const NlbStopSchema = z.object({
  stopId: z.string().min(1),
  stopName_c: z.string().min(1),
  stopName_e: z.string().min(1),
  latitude: z.coerce.number().finite(),
  longitude: z.coerce.number().finite(),
})

export interface NlbRouteSnapshot {
  routes: z.input<typeof NlbRouteSchema>[]
  stopsByRoute: Record<string, z.input<typeof NlbStopSchema>[]>
}

// Keep the first runtime integration bounded; each selected route needs one stop request.
export const nlbFeaturedRouteIds = ['1', '2', '3', '4'] as const

export function normalizeNlbRoutes(snapshot: NlbRouteSnapshot) {
  const routes = z.array(NlbRouteSchema).parse(snapshot.routes)
  const normalized = routes.flatMap(route => {
    const stops = z.array(NlbStopSchema).parse(snapshot.stopsByRoute[route.routeId] ?? [])
    const geometry = stops.map(stop => [stop.longitude, stop.latitude] as Coordinate)
    if (stops.length < 2) return []

    return [{
      id: `nlb-${route.routeId}`,
      operator: 'NLB',
      routeNumber: route.routeNo,
      nameEn: route.routeName_e,
      nameZh: route.routeName_c,
      color: '#f97316',
      stopIds: stops.map(stop => stop.stopId),
      geometry,
    }]
  })

  return BusRoutesSchema.parse(normalized)
}
