import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../../i18n'
import { hkiaFacility, hkiaRunways } from '../../dataAdapters/airport'
import { hkiaGroundFeatures } from '../../dataAdapters/airportGround'
import type { BusRoute, FerryRoute, RailLine, Station, TramRoute, VehiclePosition } from '../../types'
import { busRoutesToGeoJson, linesToGeoJson, stationsToGeoJson, vehiclesToExtrusionGeoJson, vehiclesToPointGeoJson } from '../../layers/vehicleShapes'

interface Props {
  lines: RailLine[]
  busRoutes: BusRoute[]
  ferryRoutes: FerryRoute[]
  tramRoutes: TramRoute[]
  stations: Station[]
  vehicles: VehiclePosition[]
  selectedLineIds: Set<string>
  pitchEnabled: boolean
  onSelectVehicle: (vehicle: VehiclePosition | null) => void
}

const emptyCollection = { type: 'FeatureCollection' as const, features: [] }
const HONG_KONG_BOUNDS = {
  minLng: 113.88,
  maxLng: 114.28,
  minLat: 22.23,
  maxLat: 22.49,
}

function project([lng, lat]: [number, number]): { x: number; y: number } {
  const x = ((lng - HONG_KONG_BOUNDS.minLng) / (HONG_KONG_BOUNDS.maxLng - HONG_KONG_BOUNDS.minLng)) * 1000
  const y = (1 - (lat - HONG_KONG_BOUNDS.minLat) / (HONG_KONG_BOUNDS.maxLat - HONG_KONG_BOUNDS.minLat)) * 1000
  return { x, y }
}

function pathForGeometry(geometry: [number, number][]): string {
  return geometry
    .map((coord, index) => {
      const point = project(coord)
      return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    })
    .join(' ')
}

function pathForLine(line: RailLine): string {
  return pathForGeometry(line.geometry)
}

function ferryRoutesToGeoJson(routes: FerryRoute[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes.map(route => ({
      type: 'Feature',
      id: route.id,
      geometry: { type: 'LineString', coordinates: route.geometry },
      properties: {
        id: route.id,
        color: route.color,
        operator: route.operator,
        routeNumber: route.routeNumber,
        nameEn: route.nameEn,
        nameZh: route.nameZh,
      },
    })),
  }
}

function tramRoutesToGeoJson(routes: TramRoute[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes.map(route => ({
      type: 'Feature',
      id: route.id,
      geometry: { type: 'LineString', coordinates: route.geometry },
      properties: {
        id: route.id,
        color: route.color,
        operator: route.operator,
        routeNumber: route.routeNumber,
        nameEn: route.nameEn,
        nameZh: route.nameZh,
      },
    })),
  }
}

function updateSource(map: MapLibreMap, id: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(id) as GeoJSONSource | undefined
  source?.setData(data)
}

function airportFacilitiesToGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: hkiaFacility.id,
      geometry: { type: 'Point', coordinates: hkiaFacility.coordinates },
      properties: {
        id: hkiaFacility.id,
        nameEn: hkiaFacility.nameEn,
        nameZh: hkiaFacility.nameZh,
        iataCode: hkiaFacility.iataCode,
        icaoCode: hkiaFacility.icaoCode,
      },
    }],
  }
}

function airportRunwaysToGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: hkiaRunways.map(runway => ({
      type: 'Feature',
      id: runway.id,
      geometry: { type: 'LineString', coordinates: runway.geometry },
      properties: { id: runway.id, designator: runway.designator },
    })),
  }
}

function airportGroundToGeoJson(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: hkiaGroundFeatures.map(feature => ({
      type: 'Feature',
      id: feature.id,
      geometry: { type: 'Point', coordinates: feature.coordinates },
      properties: {
        id: feature.id,
        kind: feature.kind,
        ref: feature.ref,
        nameEn: feature.nameEn,
        nameZh: feature.nameZh,
      },
    })),
  }
}

export function MapView({ lines, busRoutes, ferryRoutes, tramRoutes, stations, vehicles, selectedLineIds, pitchEnabled, onSelectVehicle }: Props) {
  const mapNode = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const vehiclesRef = useRef<VehiclePosition[]>(vehicles)
  const onSelectVehicleRef = useRef(onSelectVehicle)
  const linesRef = useRef(lines)
  const busRoutesRef = useRef(busRoutes)
  const ferryRoutesRef = useRef(ferryRoutes)
  const tramRoutesRef = useRef(tramRoutes)
  const stationsRef = useRef(stations)
  const selectedLineIdsRef = useRef(selectedLineIds)
  const { lang } = useI18n()

  const visibleVehicles = useMemo(
    () => vehicles.filter(vehicle => vehicle.type === 'bus' || vehicle.type === 'ferry' || vehicle.type === 'tram' || vehicle.type === 'flight' || selectedLineIds.has(vehicle.lineId)),
    [vehicles, selectedLineIds],
  )

  useEffect(() => {
    vehiclesRef.current = visibleVehicles
  }, [visibleVehicles])

  useEffect(() => {
    linesRef.current = lines
    busRoutesRef.current = busRoutes
    ferryRoutesRef.current = ferryRoutes
    tramRoutesRef.current = tramRoutes
    stationsRef.current = stations
    selectedLineIdsRef.current = selectedLineIds
  }, [busRoutes, ferryRoutes, lines, selectedLineIds, stations, tramRoutes])

  useEffect(() => {
    onSelectVehicleRef.current = onSelectVehicle
  }, [onSelectVehicle])

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapNode.current,
      center: [114.10, 22.32],
      zoom: 10.8,
      pitch: 58,
      bearing: -18,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          },
        },
        layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
      },
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.on('load', () => {
      map.addSource('rail-lines', { type: 'geojson', data: emptyCollection })
      map.addSource('bus-routes', { type: 'geojson', data: emptyCollection })
      map.addSource('ferry-routes', { type: 'geojson', data: emptyCollection })
      map.addSource('tram-routes', { type: 'geojson', data: emptyCollection })
      map.addSource('airport-facilities', { type: 'geojson', data: emptyCollection })
      map.addSource('airport-runways', { type: 'geojson', data: emptyCollection })
      map.addSource('airport-ground', { type: 'geojson', data: emptyCollection })
      map.addSource('stations', { type: 'geojson', data: emptyCollection })
      map.addSource('vehicles', { type: 'geojson', data: emptyCollection })
      map.addSource('vehicle-extrusions', { type: 'geojson', data: emptyCollection })

      map.addLayer({
        id: 'rail-lines-glow',
        type: 'line',
        source: 'rail-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 9, 4],
          'line-opacity': ['case', ['get', 'selected'], 0.32, 0.08],
        },
      })
      map.addLayer({
        id: 'rail-lines-core',
        type: 'line',
        source: 'rail-lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 3.6, 1.4],
          'line-opacity': ['case', ['get', 'selected'], 0.95, 0.18],
        },
      })
      map.addLayer({
        id: 'bus-routes',
        type: 'line',
        source: 'bus-routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0.55,
          'line-dasharray': [2, 2],
        },
      })
      map.addLayer({
        id: 'ferry-routes',
        type: 'line',
        source: 'ferry-routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.4,
          'line-opacity': 0.78,
        },
      })
      map.addLayer({
        id: 'tram-routes',
        type: 'line',
        source: 'tram-routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.2,
          'line-opacity': 0.78,
        },
      })
      map.addLayer({
        id: 'airport-facilities-circle',
        type: 'circle',
        source: 'airport-facilities',
        paint: {
          'circle-radius': 8,
          'circle-color': '#38bdf8',
          'circle-stroke-color': '#f8fafc',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'airport-runways',
        type: 'line',
        source: 'airport-runways',
        paint: {
          'line-color': '#cbd5e1',
          'line-width': 3,
          'line-opacity': 0.65,
          'line-dasharray': [2, 1],
        },
      })
      map.addLayer({
        id: 'airport-ground',
        type: 'circle',
        source: 'airport-ground',
        paint: {
          'circle-radius': ['match', ['get', 'kind'], 'terminal', 6, 3],
          'circle-color': ['match', ['get', 'kind'], 'terminal', '#f59e0b', '#a78bfa'],
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 1,
          'circle-opacity': 0.88,
        },
      })
      map.addLayer({
        id: 'airport-ground-label',
        type: 'symbol',
        source: 'airport-ground',
        minzoom: 11.4,
        layout: {
          'text-field': ['get', 'nameEn'],
          'text-size': 9,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#fcd34d',
          'text-halo-color': '#020617',
          'text-halo-width': 1,
        },
      })
      map.addLayer({
        id: 'airport-facilities-label',
        type: 'symbol',
        source: 'airport-facilities',
        layout: {
          'text-field': ['get', 'nameEn'],
          'text-size': 11,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#bae6fd',
          'text-halo-color': '#020617',
          'text-halo-width': 1.2,
        },
      })
      map.addLayer({
        id: 'stations-circle',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': 5,
          'circle-color': '#f8fafc',
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 1.5,
        },
      })
      map.addLayer({
        id: 'stations-label',
        type: 'symbol',
        source: 'stations',
        minzoom: 11,
        layout: {
          'text-field': ['get', 'nameEn'],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': '#020617',
          'text-halo-width': 1,
        },
      })
      map.addLayer({
        id: 'vehicle-extrusions',
        type: 'fill-extrusion',
        source: 'vehicle-extrusions',
        minzoom: 12,
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base'],
          'fill-extrusion-opacity': 0.92,
        },
      })
      map.addLayer({
        id: 'vehicles-circle',
        type: 'circle',
        source: 'vehicles',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'mode'], 'flight'], 7, ['==', ['get', 'mode'], 'light_rail'], 5, 6],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#f8fafc',
          'circle-stroke-width': 1,
        },
      })
      map.addLayer({
        id: 'vehicles-label',
        type: 'symbol',
        source: 'vehicles',
        minzoom: 11.2,
        layout: {
          'text-field': ['get', 'labelEn'],
          'text-size': 10,
          'text-offset': [0, -1.4],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#020617',
          'text-halo-width': 1,
        },
      })
      map.on('click', 'vehicles-circle', event => {
        const id = event.features?.[0]?.properties?.id
        const vehicle = vehiclesRef.current.find(item => item.id === id)
        onSelectVehicleRef.current(vehicle ?? null)
      })
      map.on('mouseenter', 'vehicles-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'vehicles-circle', () => { map.getCanvas().style.cursor = '' })
      updateSource(map, 'rail-lines', linesToGeoJson(linesRef.current, selectedLineIdsRef.current))
      updateSource(map, 'bus-routes', busRoutesToGeoJson(busRoutesRef.current))
      updateSource(map, 'ferry-routes', ferryRoutesToGeoJson(ferryRoutesRef.current))
      updateSource(map, 'tram-routes', tramRoutesToGeoJson(tramRoutesRef.current))
      updateSource(map, 'airport-facilities', airportFacilitiesToGeoJson())
      updateSource(map, 'airport-runways', airportRunwaysToGeoJson())
      updateSource(map, 'airport-ground', airportGroundToGeoJson())
      updateSource(map, 'stations', stationsToGeoJson(stationsRef.current))
      updateSource(map, 'vehicles', vehiclesToPointGeoJson(vehiclesRef.current))
      updateSource(map, 'vehicle-extrusions', vehiclesToExtrusionGeoJson(vehiclesRef.current))
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getSource('rail-lines')) return
    updateSource(map, 'rail-lines', linesToGeoJson(lines, selectedLineIds))
    updateSource(map, 'stations', stationsToGeoJson(stations))
    updateSource(map, 'vehicles', vehiclesToPointGeoJson(visibleVehicles))
    updateSource(map, 'vehicle-extrusions', vehiclesToExtrusionGeoJson(visibleVehicles))
    updateSource(map, 'bus-routes', busRoutesToGeoJson(busRoutes))
    updateSource(map, 'ferry-routes', ferryRoutesToGeoJson(ferryRoutes))
    updateSource(map, 'tram-routes', tramRoutesToGeoJson(tramRoutes))
    updateSource(map, 'airport-facilities', airportFacilitiesToGeoJson())
    updateSource(map, 'airport-runways', airportRunwaysToGeoJson())
    updateSource(map, 'airport-ground', airportGroundToGeoJson())
  }, [busRoutes, ferryRoutes, lines, selectedLineIds, stations, tramRoutes, visibleVehicles])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('stations-label')) {
      map.setLayoutProperty('stations-label', 'text-field', ['get', lang === 'zh' ? 'nameZh' : lang === 'pt' ? 'namePt' : 'nameEn'])
    }
    if (map.getLayer('vehicles-label')) {
      map.setLayoutProperty('vehicles-label', 'text-field', ['get', lang === 'zh' ? 'labelZh' : lang === 'pt' ? 'labelPt' : 'labelEn'])
    }
    if (map.getLayer('airport-facilities-label')) {
      map.setLayoutProperty('airport-facilities-label', 'text-field', ['get', lang === 'zh' ? 'nameZh' : 'nameEn'])
    }
    if (map.getLayer('airport-ground-label')) {
      map.setLayoutProperty('airport-ground-label', 'text-field', ['get', lang === 'zh' ? 'nameZh' : 'nameEn'])
    }
  }, [lang])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ pitch: pitchEnabled ? 58 : 0, bearing: pitchEnabled ? -18 : 0, duration: 450 })
  }, [pitchEnabled])

  return (
    <div className="map-frame">
      <div className="map-view" ref={mapNode} />
      <svg className="schematic-overlay" viewBox="0 0 1000 1000" role="img" aria-label="Hong Kong rail schematic">
        <defs>
          <pattern id="harbour-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(148, 163, 184, 0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1000" height="1000" fill="url(#harbour-grid)" />
        <path
          d="M 80 680 C 220 590 390 630 500 560 C 650 470 760 500 900 430"
          fill="none"
          stroke="rgba(14, 165, 233, 0.16)"
          strokeWidth="72"
          strokeLinecap="round"
        />
        {lines.map(line => (
          <g key={line.id} opacity={selectedLineIds.has(line.id) ? 1 : 0.18}>
            <path d={pathForLine(line)} fill="none" stroke={line.color} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.18" />
            <path d={pathForLine(line)} fill="none" stroke={line.color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
        {busRoutes.map(route => (
          <path
            key={route.id}
            d={pathForGeometry(route.geometry)}
            fill="none"
            stroke={route.color}
            strokeWidth="2"
            strokeDasharray="8 8"
            opacity="0.42"
          />
        ))}
        {ferryRoutes.map(route => (
          <path
            key={route.id}
            d={pathForGeometry(route.geometry)}
            fill="none"
            stroke={route.color}
            strokeWidth="3"
            opacity="0.72"
          />
        ))}
        {tramRoutes.map(route => (
          <path
            key={route.id}
            d={pathForGeometry(route.geometry)}
            fill="none"
            stroke={route.color}
            strokeWidth="3"
            strokeDasharray="3 5"
            opacity="0.74"
          />
        ))}
        {stations.map(station => {
          const point = project(station.coordinates)
          return (
            <circle
              key={station.id}
              cx={point.x}
              cy={point.y}
              r="7"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="2"
            />
          )
        })}
        {(() => {
          const point = project(hkiaFacility.coordinates)
          return (
            <g className="airport-hotspot">
              <circle cx={point.x} cy={point.y} r="12" fill="#38bdf8" stroke="#f8fafc" strokeWidth="3" />
              <text x={point.x} y={point.y - 18} textAnchor="middle" fill="#bae6fd" fontSize="16" fontWeight="700">HKIA</text>
            </g>
          )
        })()}
        {hkiaRunways.map(runway => (
          <path
            key={runway.id}
            d={pathForGeometry(runway.geometry)}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="4"
            strokeDasharray="8 4"
            opacity="0.72"
          />
        ))}
        {hkiaGroundFeatures.map(feature => {
          const point = project(feature.coordinates)
          return (
            <g key={feature.id}>
              <circle cx={point.x} cy={point.y} r={feature.kind === 'terminal' ? 9 : 5} fill={feature.kind === 'terminal' ? '#f59e0b' : '#a78bfa'} stroke="#0f172a" strokeWidth="2" />
              <text x={point.x} y={point.y - (feature.kind === 'terminal' ? 13 : 8)} textAnchor="middle" fill="#fcd34d" fontSize={feature.kind === 'terminal' ? 12 : 8}>{feature.ref}</text>
            </g>
          )
        })}
        {visibleVehicles.map(vehicle => {
          const point = project(vehicle.coordinates)
          return (
            <circle
              key={vehicle.id}
              className="vehicle-hotspot"
              cx={point.x}
              cy={point.y}
              r="8"
              fill="#f8fafc"
              stroke={vehicle.color}
              strokeWidth="4"
              onClick={() => onSelectVehicle(vehicle)}
              aria-label={vehicle.labelEn}
            />
          )
        })}
      </svg>
    </div>
  )
}
