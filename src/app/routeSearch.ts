import type { BusRoute, FerryRoute, Lang, RailLine, TramRoute } from '../types'

export type SearchableRoute = RailLine | BusRoute | FerryRoute | TramRoute

function routeText(route: SearchableRoute, lang: Lang): string {
  const localized = lang === 'zh' ? route.nameZh : lang === 'pt' ? route.namePt : route.nameEn
  return [route.id, route.operator, route.nameEn, route.nameZh, route.namePt ?? '', localized].join(' ').toLowerCase()
}

export function searchRoutes<T extends SearchableRoute>(routes: T[], query: string, lang: Lang): T[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return routes
  return routes.filter(route => routeText(route, lang).includes(normalizedQuery))
}
