import { describe, expect, it } from 'vitest'
import { normalizeKmbRoutes } from './kmb'

describe('normalizeKmbRoutes', () => {
  it('normalizes route direction, ordered stops, and API coordinates', () => {
    const routes = normalizeKmbRoutes({
      generatedAt: '2026-08-28T09:42:47+08:00',
      routes: [{
        route: '1', bound: 'O', service_type: '1',
        orig_en: 'CHUK YUEN ESTATE', orig_tc: '竹園邨',
        dest_en: 'STAR FERRY', dest_tc: '尖沙咀碼頭',
      }],
      routeStops: [
        { route: '1', bound: 'O', service_type: '1', seq: 2, stop: 'B' },
        { route: '1', bound: 'O', service_type: '1', seq: 1, stop: 'A' },
      ],
      stops: [
        { stop: 'A', lat: '22.3', long: '114.1' },
        { stop: 'B', lat: '22.4', long: '114.2' },
      ],
    })

    expect(routes[0]).toMatchObject({
      id: 'kmb-1-o-1',
      routeNumber: '1',
      stopIds: ['A', 'B'],
      geometry: [[114.1, 22.3], [114.2, 22.4]],
    })
  })

  it('omits a route when any ordered stop coordinate is unavailable', () => {
    const routes = normalizeKmbRoutes({
      generatedAt: '2026-08-28T09:42:47+08:00',
      routes: [{
        route: '1', bound: 'O', service_type: '1',
        orig_en: 'A', orig_tc: '甲', dest_en: 'B', dest_tc: '乙',
      }],
      routeStops: [
        { route: '1', bound: 'O', service_type: '1', seq: 1, stop: 'A' },
        { route: '1', bound: 'O', service_type: '1', seq: 2, stop: 'B' },
      ],
      stops: [{ stop: 'A', lat: 22.3, long: 114.1 }],
    })

    expect(routes).toEqual([])
  })
})
