import { describe, expect, it } from 'vitest'
import { busRoutesToGeoJson } from './vehicleShapes'

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
