import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson'
import type { RailLine, Station, VehiclePosition } from '../types'

const M_PER_DEG = 111320

function offset(lng: number, lat: number, bearingDeg: number, sideM: number, forwardM: number): [number, number] {
  const theta = (bearingDeg * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const eastM = sideM * cos + forwardM * sin
  const northM = -sideM * sin + forwardM * cos
  return [
    lng + eastM / (M_PER_DEG * Math.max(Math.cos((lat * Math.PI) / 180), 1e-6)),
    lat + northM / M_PER_DEG,
  ]
}

function vehiclePolygon(vehicle: VehiclePosition): Feature<Polygon> {
  const [lng, lat] = vehicle.coordinates
  const length = vehicle.type === 'light_rail' ? 32 : 46
  const width = vehicle.type === 'light_rail' ? 6 : 7
  const coords = [
    offset(lng, lat, vehicle.bearing, -width / 2, -length / 2),
    offset(lng, lat, vehicle.bearing, width / 2, -length / 2),
    offset(lng, lat, vehicle.bearing, width / 2, length / 2),
    offset(lng, lat, vehicle.bearing, -width / 2, length / 2),
    offset(lng, lat, vehicle.bearing, -width / 2, -length / 2),
  ]
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {
      id: vehicle.id,
      color: vehicle.color,
      mode: vehicle.type,
      height: vehicle.type === 'light_rail' ? 5 : 7,
      base: vehicle.type === 'light_rail' ? 0.2 : 0.4,
    },
  }
}

export function linesToGeoJson(lines: RailLine[], selectedIds: Set<string>): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: lines.map(line => ({
      type: 'Feature',
      id: line.id,
      geometry: { type: 'LineString', coordinates: line.geometry },
      properties: {
        id: line.id,
        color: line.color,
        selected: selectedIds.has(line.id),
        nameEn: line.nameEn,
        nameZh: line.nameZh,
      },
    })),
  }
}

export function stationsToGeoJson(stations: Station[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: stations.map(station => ({
      type: 'Feature',
      id: station.id,
      geometry: { type: 'Point', coordinates: station.coordinates },
      properties: {
        id: station.id,
        nameEn: station.nameEn,
        nameZh: station.nameZh,
        namePt: station.namePt ?? station.nameEn,
      },
    })),
  }
}

export function vehiclesToPointGeoJson(vehicles: VehiclePosition[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: vehicles.map(vehicle => ({
      type: 'Feature',
      id: vehicle.id,
      geometry: { type: 'Point', coordinates: vehicle.coordinates },
      properties: {
        id: vehicle.id,
        color: vehicle.color,
        labelEn: vehicle.labelEn,
        labelZh: vehicle.labelZh,
        labelPt: vehicle.labelPt,
        mode: vehicle.type,
      },
    })),
  }
}

export function vehiclesToExtrusionGeoJson(vehicles: VehiclePosition[]): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: vehicles.map(vehiclePolygon),
  }
}
