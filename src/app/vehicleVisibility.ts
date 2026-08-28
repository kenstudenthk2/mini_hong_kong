import type { VehiclePosition } from '../types'

export function isVehicleVisible(
  vehicle: VehiclePosition,
  selectedLineIds: Set<string>,
  selectedRouteIds: Set<string>,
  selectedBusOperators: Set<string>,
): boolean {
  if (vehicle.type === 'flight') return true
  if (vehicle.type === 'bus') {
    const operator = vehicle.lineId.startsWith('citybus-')
      ? 'Citybus'
      : vehicle.lineId.startsWith('nlb-')
        ? 'NLB'
        : vehicle.lineId.startsWith('gmb-')
          ? 'GMB'
          : 'KMB/LWB'
    return selectedBusOperators.has(operator)
  }
  if (vehicle.type === 'ferry' || vehicle.type === 'tram') return selectedRouteIds.has(vehicle.lineId)
  return selectedLineIds.has(vehicle.lineId)
}

export function visibleVehicleCount(
  vehicles: VehiclePosition[],
  selectedLineIds: Set<string>,
  selectedRouteIds: Set<string>,
  selectedBusOperators: Set<string>,
  type: VehiclePosition['type'],
): number {
  return vehicles.filter(vehicle => vehicle.type === type && isVehicleVisible(vehicle, selectedLineIds, selectedRouteIds, selectedBusOperators)).length
}

export function activeBusRouteIds(vehicles: VehiclePosition[]): Set<string> {
  return new Set(vehicles.filter(vehicle => vehicle.type === 'bus').map(vehicle => vehicle.lineId))
}

export function isSelectedVehicleCurrent(
  selectedVehicle: VehiclePosition,
  vehicles: VehiclePosition[],
  selectedLineIds: Set<string>,
  selectedRouteIds: Set<string>,
  selectedBusOperators: Set<string>,
): boolean {
  return vehicles.some(vehicle => vehicle.id === selectedVehicle.id)
    && isVehicleVisible(selectedVehicle, selectedLineIds, selectedRouteIds, selectedBusOperators)
}
