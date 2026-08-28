import { describe, expect, it } from 'vitest'
import { busRoutesToGeoJson, vehiclesToExtrusionGeoJson, vehiclesToTrailGeoJson } from './vehicleShapes'

describe('busRoutesToGeoJson', () => {
  it('converts normalized bus geometry and route metadata to LineStrings', () => {
    const result = busRoutesToGeoJson([{
      id: 'kmb-1-o-1',
      operator: 'KMB/LWB',
      routeNumber: '1',
      nameEn: 'CHUK YUEN ESTATE - STAR FERRY',
      nameZh: '竹園邨 - 尖沙咀碼頭',
      color: '#0f766e',
      stopIds: ['A', 'B'],
      geometry: [[114.1, 22.3], [114.2, 22.4]],
    }])

    expect(result).toEqual({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'kmb-1-o-1',
        geometry: { type: 'LineString', coordinates: [[114.1, 22.3], [114.2, 22.4]] },
        properties: {
          id: 'kmb-1-o-1',
          color: '#0f766e',
          operator: 'KMB/LWB',
          routeNumber: '1',
          nameEn: 'CHUK YUEN ESTATE - STAR FERRY',
          nameZh: '竹園邨 - 尖沙咀碼頭',
        },
      }],
    })
  })
})

describe('vehiclesToExtrusionGeoJson', () => {
  it('uses a pointed low-profile footprint for aircraft', () => {
    const result = vehiclesToExtrusionGeoJson([{
      id: 'flight-replay',
      type: 'flight',
      lineId: 'hkg-rwy-07l-25r',
      tripId: 'flight-1',
      color: '#f97316',
      coordinates: [113.9, 22.31],
      bearing: 90,
      progress: 0.5,
      labelEn: 'HKIA movement replay',
      labelZh: '\u9999\u6e2f\u570b\u969b\u6a5f\u5834\u79fb\u52d5\u91cd\u64ad',
      labelPt: 'Repeticao de movimento HKIA',
      nextStopId: null,
      destinationId: null,
    }])

    expect(result.features[0].geometry.coordinates[0]).toHaveLength(7)
    expect(result.features[0].properties).toMatchObject({ mode: 'flight', height: 1.5 })
  })
})

describe('vehiclesToTrailGeoJson', () => {
  it('creates a route-progress trail ending at the current vehicle position', () => {
    const result = vehiclesToTrailGeoJson([{
      id: 'bus-1', type: 'bus', lineId: 'route-1', tripId: 'trip-1', color: '#0f766e',
      coordinates: [114.15, 22.35], bearing: 0, progress: 0.5,
      labelEn: 'Bus', labelZh: '\u5df4\u58eb', labelPt: 'Autocarro', nextStopId: null, destinationId: null,
    }], [{ id: 'route-1', geometry: [[114.1, 22.3], [114.2, 22.4], [114.3, 22.5]] }])

    expect(result.features[0].geometry.coordinates).toEqual([[114.1, 22.3], [114.2, 22.4], [114.15, 22.35]])
    expect(result.features[0].properties).toMatchObject({ color: '#0f766e', mode: 'bus' })
  })
})
