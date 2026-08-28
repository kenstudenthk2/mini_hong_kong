import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../../i18n'
import { hkiaFacility, hkiaRunways } from '../../dataAdapters/airport'
import { hkiaGroundFeatures, type AirportGroundFeature } from '../../dataAdapters/airportGround'
import { activeBusRouteIds, isVehicleVisible } from '../../app/vehicleVisibility'
import type { SearchableRoute } from '../../app/routeSearch'
import type { TransportTool } from '../menu/DirectoryMenu'
import type { AirportFacility, BusRoute, FerryRoute, RailLine, Station, TramRoute, VehiclePosition } from '../../types'
import { busRoutesToGeoJson, linesToGeoJson, stationsToGeoJson, vehiclesToExtrusionGeoJson, vehiclesToPointGeoJson, vehiclesToTrailGeoJson } from '../../layers/vehicleShapes'

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
  onSelectFacility: (facility: AirportFacility | null) => void
  onSelectGroundFeature: (feature: AirportGroundFeature | null) => void
  onClearRouteSearch: () => void
  selectedVehicleId: string | null
  selectedStationId: string | null
  selectedFacilityId: string | null
  selectedGroundFeatureId: string | null
  selectedRouteSearchId: string | null
  followSelectedVehicle: boolean
  activeTools: Set<TransportTool>
}

const emptyCollection = { type: 'FeatureCollection' as const, features: [] }
export const DEFAULT_MAP_VIEW = {
  center: [114.16, 22.32] as [number, number],
  zoom: 12.4,
  pitch: 58,
  bearing: -18,
}

export function basemapVisibilityForPitch(pitchEnabled: boolean): { light: 'visible' | 'none'; dark: 'visible' | 'none' } {
  return pitchEnabled
    ? { light: 'none', dark: 'visible' }
    : { light: 'visible', dark: 'none' }
}

export function airportLayersVisible(activeTools: Set<TransportTool>): boolean {
  return activeTools.has('flights')
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

export function isClearSelectionShortcut(event: Pick<KeyboardEvent, 'code'>): boolean {
  return event.code === 'Escape'
}

export function selectedRouteCenter(routes: SearchableRoute[], selectedRouteId: string | null): [number, number] | null {
  const route = routes.find(item => item.id === selectedRouteId)
  return route?.geometry[0] ?? null
}

export function selectedRouteGeometry(routes: SearchableRoute[], selectedRouteId: string | null): [number, number][] {
  return routes.find(item => item.id === selectedRouteId)?.geometry ?? []
}

export function selectedRouteBounds(routes: SearchableRoute[], selectedRouteId: string | null): [[number, number], [number, number]] | null {
  const geometry = selectedRouteGeometry(routes, selectedRouteId)
  if (!geometry.length) return null
  const longitudes = geometry.map(([longitude]) => longitude)
  const latitudes = geometry.map(([, latitude]) => latitude)
  return [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]]
}

function lineTool(line: RailLine): TransportTool {
  return line.mode === 'mtr' ? 'rail' : 'lightRail'
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

function airportFacilitiesToGeoJson(selectedFacilityId: string | null): GeoJSON.FeatureCollection {
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
        selected: hkiaFacility.id === selectedFacilityId,
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

function airportGroundToGeoJson(selectedGroundFeatureId: string | null): GeoJSON.FeatureCollection {
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
        selected: feature.id === selectedGroundFeatureId,
      },
    })),
  }
}

export function MapView({ lines, busRoutes, ferryRoutes, tramRoutes, stations, vehicles, selectedLineIds, selectedRouteIds, selectedBusOperators, pitchEnabled, onSelectVehicle, onSelectStation, onSelectFacility, onSelectGroundFeature, onClearRouteSearch, selectedVehicleId, selectedStationId, selectedFacilityId, selectedGroundFeatureId, selectedRouteSearchId, followSelectedVehicle, activeTools }: Props) {
  const mapNode = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const initialPitchEnabledRef = useRef(pitchEnabled)
  const vehiclesRef = useRef<VehiclePosition[]>(vehicles)
  const onSelectVehicleRef = useRef(onSelectVehicle)
  const onSelectStationRef = useRef(onSelectStation)
  const onSelectFacilityRef = useRef(onSelectFacility)
  const onSelectGroundFeatureRef = useRef(onSelectGroundFeature)
  const onClearRouteSearchRef = useRef(onClearRouteSearch)
  const linesRef = useRef(lines)
  const busRoutesRef = useRef(busRoutes)
  const ferryRoutesRef = useRef(ferryRoutes)
  const tramRoutesRef = useRef(tramRoutes)
  const stationsRef = useRef(stations)
  const selectedLineIdsRef = useRef(selectedLineIds)
  const selectedRouteIdsRef = useRef(selectedRouteIds)
  const selectedBusOperatorsRef = useRef(selectedBusOperators)
  const selectedFacilityIdRef = useRef(selectedFacilityId)
  const selectedGroundFeatureIdRef = useRef(selectedGroundFeatureId)
  const selectedRouteSearchIdRef = useRef(selectedRouteSearchId)
  const activeToolsRef = useRef(activeTools)
  const { lang } = useI18n()

  const visibleVehicles = useMemo(
    () => vehicles.filter(vehicle => isVehicleVisible(vehicle, selectedLineIds, selectedRouteIds, selectedBusOperators)),
    [vehicles, selectedBusOperators, selectedLineIds, selectedRouteIds],
  )
  const visibleBusRouteIds = useMemo(() => activeBusRouteIds(visibleVehicles), [visibleVehicles])

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
    selectedFacilityIdRef.current = selectedFacilityId
    selectedGroundFeatureIdRef.current = selectedGroundFeatureId
    selectedRouteSearchIdRef.current = selectedRouteSearchId
    activeToolsRef.current = activeTools
  }, [activeTools, busRoutes, ferryRoutes, lines, selectedBusOperators, selectedFacilityId, selectedGroundFeatureId, selectedLineIds, selectedRouteIds, selectedRouteSearchId, stations, tramRoutes])

  useEffect(() => {
      onSelectVehicleRef.current = onSelectVehicle
  }, [onSelectVehicle])

  useEffect(() => {
    onSelectStationRef.current = onSelectStation
  }, [onSelectStation])

  useEffect(() => {
    onSelectFacilityRef.current = onSelectFacility
  }, [onSelectFacility])

  useEffect(() => {
    onSelectGroundFeatureRef.current = onSelectGroundFeature
  }, [onSelectGroundFeature])

  useEffect(() => {
    onClearRouteSearchRef.current = onClearRouteSearch
  }, [onClearRouteSearch])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isClearSelectionShortcut(event)) return
      onSelectVehicleRef.current(null)
      onSelectStationRef.current(null)
      onSelectFacilityRef.current(null)
      onSelectGroundFeatureRef.current(null)
      onClearRouteSearchRef.current()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapNode.current,
      center: DEFAULT_MAP_VIEW.center,
      zoom: DEFAULT_MAP_VIEW.zoom,
      pitch: DEFAULT_MAP_VIEW.pitch,
      bearing: DEFAULT_MAP_VIEW.bearing,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
          openfreemap: {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
          },
        },
        layers: [
          { id: 'base-light', type: 'raster', source: 'carto', layout: { visibility: basemapVisibilityForPitch(initialPitchEnabledRef.current).light } },
          {
            id: 'base-dark',
            type: 'raster',
            source: 'carto',
            layout: { visibility: basemapVisibilityForPitch(initialPitchEnabledRef.current).dark },
            paint: {
              'raster-brightness-min': 0.05,
              'raster-brightness-max': 0.3,
              'raster-saturation': -1,
              'raster-contrast': 0.25,
            },
          },
        ],
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
      map.addSource('vehicle-trails', { type: 'geojson', data: emptyCollection })
      map.addSource('route-focus', { type: 'geojson', data: emptyCollection })

      map.addLayer({
        id: '3d-buildings',
        type: 'fill-extrusion',
        source: 'openfreemap',
        'source-layer': 'building',
        minzoom: 12.5,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],
            0, '#cbd5e1',
            80, '#94a3b8',
            220, '#64748b',
          ],
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12.5, 0,
            15, ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],
          ],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.74,
          'fill-extrusion-vertical-gradient': true,
        },
      })

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
          'circle-radius': ['case', ['get', 'selected'], 11, 8],
          'circle-color': '#38bdf8',
          'circle-stroke-color': '#f8fafc',
          'circle-stroke-width': ['case', ['get', 'selected'], 4, 2],
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
          'circle-radius': ['case', ['get', 'selected'], ['match', ['get', 'kind'], 'terminal', 9, 6], ['match', ['get', 'kind'], 'terminal', 6, 3]],
          'circle-color': ['match', ['get', 'kind'], 'terminal', '#f59e0b', '#a78bfa'],
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': ['case', ['get', 'selected'], 3, 1],
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
        id: 'vehicle-trails',
        type: 'line',
        source: 'vehicle-trails',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['==', ['get', 'mode'], 'flight'], 2.5, 1.8],
          'line-opacity': ['case', ['==', ['get', 'mode'], 'flight'], 0.7, 0.45],
          'line-dasharray': [1, 2],
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
        onSelectFacilityRef.current(null)
        onSelectGroundFeatureRef.current(null)
        onSelectVehicleRef.current(vehicle ?? null)
      })
      map.on('click', 'stations-circle', event => {
        const id = event.features?.[0]?.properties?.id
        const station = stationsRef.current.find(item => item.id === id)
        onSelectVehicleRef.current(null)
        onSelectFacilityRef.current(null)
        onSelectGroundFeatureRef.current(null)
        onSelectStationRef.current(station ?? null)
      })
      map.on('click', 'airport-facilities-circle', () => {
        onSelectVehicleRef.current(null)
        onSelectStationRef.current(null)
        onSelectGroundFeatureRef.current(null)
        onSelectFacilityRef.current(hkiaFacility)
      })
      map.on('click', 'airport-ground', event => {
        const id = event.features?.[0]?.properties?.id
        const feature = hkiaGroundFeatures.find(item => item.id === id)
        onSelectVehicleRef.current(null)
        onSelectStationRef.current(null)
        onSelectFacilityRef.current(null)
        onSelectGroundFeatureRef.current(feature ?? null)
      })
      map.on('click', event => {
        const vehicleFeatures = map.queryRenderedFeatures(event.point, { layers: ['vehicles-circle'] })
        const stationFeatures = map.queryRenderedFeatures(event.point, { layers: ['stations-circle'] })
        const facilityFeatures = map.queryRenderedFeatures(event.point, { layers: ['airport-facilities-circle'] })
        const groundFeatures = map.queryRenderedFeatures(event.point, { layers: ['airport-ground'] })
        if (shouldClearVehicleSelection(vehicleFeatures.length) && shouldClearVehicleSelection(stationFeatures.length) && shouldClearVehicleSelection(facilityFeatures.length) && shouldClearVehicleSelection(groundFeatures.length)) {
          onSelectVehicleRef.current(null)
          onSelectStationRef.current(null)
          onSelectFacilityRef.current(null)
          onSelectGroundFeatureRef.current(null)
        }
      })
      map.on('mouseenter', 'vehicles-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'vehicles-circle', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'airport-facilities-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'airport-facilities-circle', () => { map.getCanvas().style.cursor = '' })
      updateSource(map, 'rail-lines', linesToGeoJson(linesRef.current.filter(line => activeToolsRef.current.has(lineTool(line))), selectedLineIdsRef.current))
      updateSource(map, 'bus-routes', busRoutesToGeoJson(busRoutesRef.current.filter(route => selectedBusOperatorsRef.current.has(route.operator) && (activeBusRouteIds(vehiclesRef.current).has(route.id) || selectedRouteSearchIdRef.current === route.id))))
      updateSource(map, 'ferry-routes', ferryRoutesToGeoJson(ferryRoutesRef.current.filter(route => selectedRouteIdsRef.current.has(route.id))))
      updateSource(map, 'tram-routes', tramRoutesToGeoJson(tramRoutesRef.current.filter(route => selectedRouteIdsRef.current.has(route.id))))
      const showAirport = airportLayersVisible(activeToolsRef.current)
      updateSource(map, 'airport-facilities', showAirport ? airportFacilitiesToGeoJson(selectedFacilityIdRef.current) : emptyCollection)
      updateSource(map, 'airport-runways', showAirport ? airportRunwaysToGeoJson() : emptyCollection)
      updateSource(map, 'airport-ground', showAirport ? airportGroundToGeoJson(selectedGroundFeatureIdRef.current) : emptyCollection)
      updateSource(map, 'stations', stationsToGeoJson(stationsRef.current))
      updateSource(map, 'vehicles', vehiclesToPointGeoJson(vehiclesRef.current))
      updateSource(map, 'vehicle-extrusions', vehiclesToExtrusionGeoJson(vehiclesRef.current))
      updateSource(map, 'vehicle-trails', vehiclesToTrailGeoJson(vehiclesRef.current, [...linesRef.current, ...busRoutesRef.current, ...ferryRoutesRef.current, ...tramRoutesRef.current, ...hkiaRunways]))
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
    updateSource(map, 'rail-lines', linesToGeoJson(lines.filter(line => activeTools.has(lineTool(line))), selectedLineIds))
    updateSource(map, 'stations', stationsToGeoJson(stations))
    updateSource(map, 'vehicles', vehiclesToPointGeoJson(visibleVehicles))
    updateSource(map, 'vehicle-extrusions', vehiclesToExtrusionGeoJson(visibleVehicles))
    updateSource(map, 'vehicle-trails', vehiclesToTrailGeoJson(visibleVehicles, [...lines, ...busRoutes, ...ferryRoutes, ...tramRoutes, ...hkiaRunways]))
    updateSource(map, 'bus-routes', busRoutesToGeoJson(busRoutes.filter(route => selectedBusOperators.has(route.operator) && (visibleBusRouteIds.has(route.id) || selectedRouteSearchId === route.id))))
    updateSource(map, 'ferry-routes', ferryRoutesToGeoJson(ferryRoutes.filter(route => selectedRouteIds.has(route.id))))
    updateSource(map, 'tram-routes', tramRoutesToGeoJson(tramRoutes.filter(route => selectedRouteIds.has(route.id))))
    const showAirport = airportLayersVisible(activeTools)
    updateSource(map, 'airport-facilities', showAirport ? airportFacilitiesToGeoJson(selectedFacilityId) : emptyCollection)
    updateSource(map, 'airport-runways', showAirport ? airportRunwaysToGeoJson() : emptyCollection)
    updateSource(map, 'airport-ground', showAirport ? airportGroundToGeoJson(selectedGroundFeatureId) : emptyCollection)
    updateSource(map, 'route-focus', routeFocusToGeoJson([...lines, ...busRoutes, ...ferryRoutes, ...tramRoutes], selectedRouteSearchId))
  }, [activeTools, busRoutes, ferryRoutes, lines, selectedBusOperators, selectedFacilityId, selectedGroundFeatureId, selectedLineIds, selectedRouteIds, selectedRouteSearchId, stations, tramRoutes, visibleBusRouteIds, visibleVehicles])

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
    const basemap = basemapVisibilityForPitch(pitchEnabled)
    if (map.getLayer('base-light')) map.setLayoutProperty('base-light', 'visibility', basemap.light)
    if (map.getLayer('base-dark')) map.setLayoutProperty('base-dark', 'visibility', basemap.dark)
    map.easeTo({ pitch: pitchEnabled ? 58 : 0, bearing: pitchEnabled ? -18 : 0, duration: 450 })
  }, [pitchEnabled])

  useEffect(() => {
    const map = mapRef.current
    const center = selectedVehicleCenter(visibleVehicles, selectedVehicleId)
    if (!map || !center || !followSelectedVehicle) return
    map.easeTo({ center, duration: 220 })
  }, [followSelectedVehicle, selectedVehicleId, visibleVehicles])

  useEffect(() => {
    const map = mapRef.current
    const station = stations.find(item => item.id === selectedStationId)
    if (!map || !station) return
    map.easeTo({ center: station.coordinates, duration: 220 })
  }, [selectedStationId, stations])

  useEffect(() => {
    const map = mapRef.current
    const routes = [...lines, ...busRoutes, ...ferryRoutes, ...tramRoutes]
    const bounds = selectedRouteBounds(routes, selectedRouteSearchId)
    if (!map || !bounds) return
    if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) {
      map.easeTo({ center: bounds[0], duration: 220 })
      return
    }
    map.fitBounds(bounds, { padding: { top: 90, right: 80, bottom: 120, left: 320 }, maxZoom: 14.5, duration: 450 })
  }, [busRoutes, ferryRoutes, lines, selectedRouteSearchId, tramRoutes])

  return (
    <div className="map-frame">
      <div className="map-view" ref={mapNode} />
    </div>
  )
}
