import { describe, expect, it } from 'vitest'
import { normalizeGmbRoutes } from './gmb'

describe('GMB route adapter', () => {
  it('normalizes one official route direction with ordered stop coordinates', () => {
    const routes = normalizeGmbRoutes({
      routes: [{
        route_id: 2006408,
        region: 'HKI',
        route_code: '1',
        directions: [{ route_seq: 1, orig_tc: '\u5c71\u9802', orig_en: 'The Peak', dest_tc: '\u4e2d\u74b0', dest_en: 'Central' }],
      }],
      routeStopsByDirection: {
        '2006408-1': [
          { stop_seq: 2, stop_id: 20014490, name_tc: '\u5c71\u9802\u9053', name_en: 'Peak Road' },
          { stop_seq: 1, stop_id: 20014489, name_tc: '\u5c71\u9802\u5ee3\u5834', name_en: 'The Peak Galleria' },
        ],
      },
      stopsById: {
        '20014489': { coordinates: { wgs84: { latitude: 22.2700845, longitude: 114.1498832 } } },
        '20014490': { coordinates: { wgs84: { latitude: 22.2705, longitude: 114.1494 } } },
      },
    })

    expect(routes).toEqual([expect.objectContaining({
      id: 'gmb-hki-2006408-1',
      operator: 'GMB',
      routeNumber: '1',
      nameEn: 'The Peak - Central',
      nameZh: '\u5c71\u9802 - \u4e2d\u74b0',
      stopIds: ['20014489', '20014490'],
      geometry: [[114.1498832, 22.2700845], [114.1494, 22.2705]],
    })])
  })

  it('omits a direction when any ordered stop coordinate is missing', () => {
    expect(normalizeGmbRoutes({
      routes: [{ route_id: 1, region: 'NT', route_code: '1', directions: [{ route_seq: 1, orig_tc: 'A', orig_en: 'A', dest_tc: 'B', dest_en: 'B' }] }],
      routeStopsByDirection: { '1-1': [{ stop_seq: 1, stop_id: 10, name_tc: 'A', name_en: 'A' }, { stop_seq: 2, stop_id: 11, name_tc: 'B', name_en: 'B' }] },
      stopsById: { '10': { coordinates: { wgs84: { latitude: 22.2, longitude: 114 } } } },
    })).toEqual([])
  })
})
