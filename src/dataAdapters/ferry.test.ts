import { describe, expect, it } from 'vitest'
import { normalizeFerryGeoJson } from './ferry'

describe('normalizeFerryGeoJson', () => {
  it('groups ordered ferry pier points into localized route directions', () => {
    expect(normalizeFerryGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [114.1, 22.2] }, properties: {
          routeId: 7001, routeNameC: '甲 - 乙', routeNameE: 'A - B', routeType: 7,
          routeSeq: 1, stopSeq: 2, stopId: 102, journeyTime: 36,
        } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [114.0, 22.1] }, properties: {
          routeId: 7001, routeNameC: '甲 - 乙', routeNameE: 'A - B', routeType: 7,
          routeSeq: 1, stopSeq: 1, stopId: 101, journeyTime: 36,
        } },
      ],
    })).toEqual([{
      id: 'ferry-7001-1',
      operator: 'Transport Department Ferry Network',
      routeNumber: '7001',
      nameEn: 'A - B',
      nameZh: '甲 - 乙',
      color: '#0284c7',
      stopIds: ['101', '102'],
      geometry: [[114.0, 22.1], [114.1, 22.2]],
      journeyTimeMinutes: 36,
    }])
  })

  it('omits non-ferry and incomplete route groups', () => {
    expect(normalizeFerryGeoJson({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [114.1, 22.2] }, properties: {
        routeId: 8001, routeNameC: '甲', routeNameE: 'A', routeType: 1,
        routeSeq: 1, stopSeq: 1, stopId: 201, journeyTime: 5,
      } }],
    })).toEqual([])
  })
})
