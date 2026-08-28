import type { BusRoute, VehiclePosition } from '../types'

export interface RouteServiceCount {
  active: number
  total: number
}

export function busRouteServiceCount(routes: BusRoute[], vehicles: VehiclePosition[], operator: string): RouteServiceCount {
  const activeRouteIds = new Set(vehicles.filter(vehicle => vehicle.type === 'bus').map(vehicle => vehicle.lineId))
  const operatorRoutes = routes.filter(route => route.operator === operator)
  return {
    active: operatorRoutes.filter(route => activeRouteIds.has(route.id)).length,
    total: operatorRoutes.length,
  }
}
