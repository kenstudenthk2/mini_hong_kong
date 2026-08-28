import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../../i18n'
import { hkiaFacility, hkiaRunways } from '../../dataAdapters/airport'
import { hkiaGroundFeatures } from '../../dataAdapters/airportGround'
import { isVehicleVisible } from '../../app/vehicleVisibility'
import type { SearchableRoute } from '../../app/routeSearch'
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
  selectedRouteIds: Set<string>
  selectedBusOperators: Set<string>
  pitchEnabled: boolean
  onSelectVehicle: (vehicle: VehiclePosition | null) => void
  onSelectStation: (station: Station | null) => void
  selectedVehicleId: string | null
  selectedStationId: string | null
  selectedRouteSearchId: string | null
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

export function selectedVehicleCenter(vehicles: VehiclePosition[], selectedVehicleId: string | null): [number, number] | null {
  const vehicle = vehicles.find(item => item.id === selectedVehicleId)
  return vehicle ? vehicle.coordinates : null
}

export function shouldClearVehicleSelection(vehicleFeatureCount: number): boolean {
  return vehicleFeatureCount === 0
}

export function selectedRouteCenter(routes: SearchableRoute[], selectedRouteId: string | null): [number, number] | null {
  const route = routes.find(item => item.id === selectedRouteId)
  return route?.geometry[0] ?? null
}

export function selectedRouteGeometry(routes: SearchableRoute[], selectedRouteId: string | null): [number, number][] {
  return routes.find(item => item.id === selectedRouteId)?.geometry ?? []
}

function routeFocusToGeoJson(routes: SearchableRoute[], selectedRouteId: string | null): GeoJSON.FeatureCollection {
  const route = routes.find(item => item.id === selectedRouteId)
  if (!route || route.geometry.length < 2) return emptyCollection
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: `focus-${route.id}`,
      geometry: { type: 'LineString', coordinates: route.geometry },
      properties: { color: route.color },
    }],
  }
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
        namePt: hkiaFacility.namePt,
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
        namePt: feature.namePt,
      },
    })),
  }
}

export function MapView({ lines, busRoutes, ferryRoutes, tramRoutes, stations, vehicles, selectedLineIds, selectedRouteIds, selectedBusOperators, pitchEnabled, onSelectVehicle, onSelectStation, selectedVehicleId, selectedStationId, selectedRouteSearchId }: Props) {
  const mapNode = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const vehiclesRef = useRef<VehiclePosition[]>(vehicles)
  const onSelectVehicleRef = useRef(onSelectVehicle)
  const onSelectStationRef = useRef(onSelectStation)
  const linesRef = useRef(lines)
  const busRoutesRef = useRef(busRoutes)
  const ferryRoutesRef = useRef(ferryRoutes)
  const tramRoutesRef = useRef(tramRoutes)
  const stationsRef = useRef(stations)
  const selectedLineIdsRef = useRef(selectedLineIds)
  const selectedRouteIdsRef = useRef(selectedRouteIds)
  const selectedBusOperatorsRef = useRef(selectedBusOperators)
  const selectedRouteSearchIdRef = useRef(selectedRouteSearchId)
  const { lang } = useI18n()

  const visibleVehicles = useMemo(
    () => vehicles.filter(vehicle => isVehicleVisible(vehicle, selectedLineIds, selectedRouteIds, selectedBusOperators)),
    [vehicles, selectedBusOperators, selectedLineIds, selectedRouteIds],
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
    selectedRouteIdsRef.current = selectedRouteIds
    selectedBusOperatorsRef.current = selectedBusOperators
    selectedRouteSearchIdRef.current = selectedRouteSearchId
  }, [busRoutes, ferryRoutes, lines, selectedBusOperators, selectedLineIds, selectedRouteIds, selectedRouteSearchId, stations, tramRoutes])

  useEffect(() => {
    onSelectVehicleRef.current = onSelectVehicle
  }, [onSelectVehicle])

  useEffect(() => {
    onSelectStationRef.current = onSelectStation
  }, [onSelectStation])

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
      map.addSource('route-focus', { type: 'geojson', data: emptyCollection })

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
        id: 'route-focus',
        type: 'line',
        source: 'route-focus',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 6,
          'line-opacity': 0.95,
          'line-blur': 0.5,
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
        onSelectStationRef.current(null)
        onSelectVehicleRef.current(vehicle ?? null)
      })
      map.on('click', 'stations-circle', event => {
        const id = event.features?.[0]?.properties?.id
        const station = stationsRef.current.find(item => item.id === id)
        onSelectVehicleRef.current(null)
        onSelectStationRef.current(station ?? null)
      })
      map.on('click', event => {
        const vehicleFeatures = map.queryRenderedFeatures(event.point, { layers: ['vehicles-circle'] })
        const stationFeatures = map.queryRenderedFeatures(event.point, { layers: ['stations-circle'] })
        if (shouldClearVehicleSelection(vehicleFeatures.length) && shouldClearVehicleSelection(stationFeatures.length)) {
          onSelectVehicleRef.current(null)
          onSelectStationRef.current(null)
        }
      })
      map.on('mouseenter', 'vehicles-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'vehicles-circle', () => { map.getCanvas().style.cursor = '' })
      updateSource(map, 'rail-lines', linesToGeoJson(linesRef.current, selectedLineIdsRef.current))
      updateSource(map, 'bus-routes', busRoutesToGeoJson(busRoutesRef.current.filter(route => selectedBusOperatorsRef.current.has(route.operator))))
      updateSource(map, 'ferry-routes', ferryRoutesToGeoJson(ferryRoutesRef.current.filter(route => selectedRouteIdsRef.current.has(route.id))))
      updateSource(map, 'tram-routes', tramRoutesToGeoJson(tramRoutesRef.current.filter(route => selectedRouteIdsRef.current.has(route.id))))
      updateSource(map, 'airport-facilities', airportFacilitiesToGeoJson())
      updateSource(map, 'airport-runways', airportRunwaysToGeoJson())
      updateSource(map, 'airport-ground', airportGroundToGeoJson())
      updateSource(map, 'stations', stationsToGeoJson(stationsRef.current))
      updateSource(map, 'vehicles', vehiclesToPointGeoJson(vehiclesRef.current))
      updateSource(map, 'vehicle-extrusions', vehiclesToExtrusionGeoJson(vehiclesRef.current))
      updateSource(map, 'route-focus', routeFocusToGeoJson([...linesRef.current, ...busRoutesRef.current, ...ferryRoutesRef.current, ...tramRoutesRef.current], selectedRouteSearchIdRef.current))
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
    updateSource(map, 'bus-routes', busRoutesToGeoJson(busRoutes.filter(route => selectedBusOperators.has(route.operator))))
    updateSource(map, 'ferry-routes', ferryRoutesToGeoJson(ferryRoutes.filter(route => selectedRouteIds.has(route.id))))
    updateSource(map, 'tram-routes', tramRoutesToGeoJson(tramRoutes.filter(route => selectedRouteIds.has(route.id))))
    updateSource(map, 'airport-facilities', airportFacilitiesToGeoJson())
    updateSource(map, 'airport-runways', airportRunwaysToGeoJson())
    updateSource(map, 'airport-ground', airportGroundToGeoJson())
    updateSource(map, 'route-focus', routeFocusToGeoJson([...lines, ...busRoutes, ...ferryRoutes, ...tramRoutes], selectedRouteSearchId))
  }, [busRoutes, ferryRoutes, lines, selectedBusOperators, selectedLineIds, selectedRouteIds, selectedRouteSearchId, stations, tramRoutes, visibleVehicles])

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
      map.setLayoutProperty('airport-facilities-label', 'text-field', ['get', lang === 'zh' ? 'nameZh' : lang === 'pt' ? 'namePt' : 'nameEn'])
    }
    if (map.getLayer('airport-ground-label')) {
      map.setLayoutProperty('airport-ground-label', 'text-field', ['get', lang === 'zh' ? 'nameZh' : lang === 'pt' ? 'namePt' : 'nameEn'])
    }
  }, [lang])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ pitch: pitchEnabled ? 58 : 0, bearing: pitchEnabled ? -18 : 0, duration: 450 })
  }, [pitchEnabled])

  useEffect(() => {
    const map = mapRef.current
    const center = selectedVehicleCenter(visibleVehicles, selectedVehicleId)
    if (!map || !center) return
    map.easeTo({ center, duration: 220 })
  }, [selectedVehicleId, visibleVehicles])

  useEffect(() => {
    const map = mapRef.current
    const station = stations.find(item => item.id === selectedStationId)
    if (!map || !station) return
    map.easeTo({ center: station.coordinates, duration: 220 })
  }, [selectedStationId, stations])

  useEffect(() => {
    const map = mapRef.current
    const center = selectedRouteCenter([...lines, ...busRoutes, ...ferryRoutes, ...tramRoutes], selectedRouteSearchId)
    if (!map || !center) return
    map.easeTo({ center, duration: 220 })
  }, [busRoutes, ferryRoutes, lines, selectedRouteSearchId, tramRoutes])

  const selectedRoute = [...lines, ...busRoutes, ...ferryRoutes, ...tramRoutes].find(item => item.id === selectedRouteSearchId)

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
        {busRoutes.filter(route => selectedBusOperators.has(route.operator)).map(route => (
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
        {ferryRoutes.filter(route => selectedRouteIds.has(route.id)).map(route => (
          <path
            key={route.id}
            d={pathForGeometry(route.geometry)}
            fill="none"
            stroke={route.color}
            strokeWidth="3"
            opacity="0.72"
          />
        ))}
        {tramRoutes.filter(route => selectedRouteIds.has(route.id)).map(route => (
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
        {selectedRoute && selectedRoute.geometry.length > 1 && (
          <path
            d={pathForGeometry(selectedRoute.geometry)}
            fill="none"
            stroke={selectedRoute.color}
            strokeWidth="8"
            strokeOpacity="0.95"
            strokeLinecap="round"
          />
        )}
        {stations.map(station => {
          const point = project(station.coordinates)
          return (
            <circle
              key={station.id}
              className="station-hotspot"
              cx={point.x}
              cy={point.y}
              r="7"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="2"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => {
                onSelectVehicle(null)
                onSelectStation(station)
              }}
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
          if (vehicle.type === 'flight') {
            return (
              <polygon
                key={vehicle.id}
                className="vehicle-hotspot"
                points="0,-15 -7,1 -4,9 0,5 4,9 7,1"
                transform={`translate(${point.x} ${point.y}) rotate(${vehicle.bearing})`}
                fill={vehicle.color}
                stroke="#f8fafc"
                strokeWidth="2"
                onClick={() => {
                  onSelectStation(null)
                  onSelectVehicle(vehicle)
                }}
                aria-label={vehicle.labelEn}
              />
            )
          }
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
              onClick={() => {
                onSelectStation(null)
                onSelectVehicle(vehicle)
              }}
              aria-label={vehicle.labelEn}
            />
          )
        })}
      </svg>
    </div>
  )
}
