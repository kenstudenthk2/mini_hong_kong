import { describe, expect, it } from 'vitest'
import { normalizeTramGeoJson } from './tram'

describe('normalizeTramGeoJson', () => {
  it('groups ordered tram stop points into localized route directions', () => {
    expect(normalizeTramGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [114.2, 22.3] }, properties: {
          routeId: 4001, routeNameC: '筲箕灣 - 上環線', routeNameE: 'Shau Kei Wan - Western Market',
          routeType: 4, routeSeq: 1, stopSeq: 2, stopId: 402, journeyTime: 68,
        } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [114.1, 22.3] }, properties: {
          routeId: 4001, routeNameC: '筲箕灣 - 上環線', routeNameE: 'Shau Kei Wan - Western Market',
          routeType: 4, routeSeq: 1, stopSeq: 1, stopId: 401, journeyTime: 68,
        } },
      ],
    })).toEqual([{
      id: 'tram-4001-1',
      operator: 'Hong Kong Tramways',
      routeNumber: '4001',
      nameEn: 'Shau Kei Wan - Western Market',
      nameZh: '筲箕灣 - 上環線',
      color: '#f59e0b',
      stopIds: ['401', '402'],
      geometry: [[114.1, 22.3], [114.2, 22.3]],
      journeyTimeMinutes: 68,
    }])
  })

  it('omits non-tram and incomplete route groups', () => {
    expect(normalizeTramGeoJson({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [114.1, 22.3] }, properties: {
        routeId: 1001, routeNameC: '甲', routeNameE: 'A', routeType: 7,
        routeSeq: 1, stopSeq: 1, stopId: 501, journeyTime: 5,
      } }],
    })).toEqual([])
  })
})
