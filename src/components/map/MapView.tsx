import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../../i18n'
import type { RailLine, Station, VehiclePosition } from '../../types'
import { linesToGeoJson, stationsToGeoJson, vehiclesToExtrusionGeoJson, vehiclesToPointGeoJson } from '../../layers/vehicleShapes'

interface Props {
  lines: RailLine[]
  stations: Station[]
  vehicles: VehiclePosition[]
  selectedLineIds: Set<string>
  pitchEnabled: boolean
  onSelectVehicle: (vehicle: VehiclePosition | null) => void
}

const emptyCollection = { type: 'FeatureCollection' as const, features: [] }

function updateSource(map: MapLibreMap, id: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(id) as GeoJSONSource | undefined
  source?.setData(data)
}

export function MapView({ lines, stations, vehicles, selectedLineIds, pitchEnabled, onSelectVehicle }: Props) {
  const mapNode = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const vehiclesRef = useRef<VehiclePosition[]>(vehicles)
  const onSelectVehicleRef = useRef(onSelectVehicle)
  const { lang } = useI18n()

  const visibleVehicles = useMemo(
    () => vehicles.filter(vehicle => selectedLineIds.has(vehicle.lineId)),
    [vehicles, selectedLineIds],
  )

  useEffect(() => {
    vehiclesRef.current = visibleVehicles
  }, [visibleVehicles])

  useEffect(() => {
    onSelectVehicleRef.current = onSelectVehicle
  }, [onSelectVehicle])

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapNode.current,
      center: [114.16, 22.32],
      zoom: 11.2,
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
          'circle-radius': ['case', ['==', ['get', 'mode'], 'light_rail'], 5, 6],
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
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    updateSource(map, 'rail-lines', linesToGeoJson(lines, selectedLineIds))
    updateSource(map, 'stations', stationsToGeoJson(stations))
    updateSource(map, 'vehicles', vehiclesToPointGeoJson(visibleVehicles))
    updateSource(map, 'vehicle-extrusions', vehiclesToExtrusionGeoJson(visibleVehicles))
  }, [lines, selectedLineIds, stations, visibleVehicles])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    if (map.getLayer('stations-label')) {
      map.setLayoutProperty('stations-label', 'text-field', ['get', lang === 'zh' ? 'nameZh' : lang === 'pt' ? 'namePt' : 'nameEn'])
    }
    if (map.getLayer('vehicles-label')) {
      map.setLayoutProperty('vehicles-label', 'text-field', ['get', lang === 'zh' ? 'labelZh' : lang === 'pt' ? 'labelPt' : 'labelEn'])
    }
  }, [lang])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ pitch: pitchEnabled ? 58 : 0, bearing: pitchEnabled ? -18 : 0, duration: 450 })
  }, [pitchEnabled])

  return <div className="map-view" ref={mapNode} />
}
