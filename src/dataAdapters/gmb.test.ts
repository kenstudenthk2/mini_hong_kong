import { describe, expect, it } from 'vitest'
import { gmbStopLimit, loadGmbFeed, loadGmbRoutes, normalizeGmbEta, normalizeGmbRoutes } from './gmb'

describe('GMB route adapter', () => {
  it('normalizes enabled ETA entries with Hong Kong timestamps and remarks', () => {
    const arrivals = normalizeGmbEta({
      generated_timestamp: '2026-08-28T14:10:31+08:00',
      data: [{
        enabled: true,
        eta: [
          { eta_seq: 1, diff: 4, timestamp: '2026-08-28T14:14:00+08:00', remarks_en: 'At stop', remarks_tc: '\u5373\u5c07\u5230\u7ad9' },
          { eta_seq: 2, diff: 11, timestamp: '2026-08-28T14:21:00+08:00', remarks_en: '', remarks_tc: '' },
        ],
      }],
    }, { routeId: 'gmb-hki-2006408-1', stopSequence: 2, destinationEn: 'Central', destinationZh: '\u4e2d\u74b0' })

    expect(arrivals).toHaveLength(2)
    expect(arrivals[0]).toEqual(expect.objectContaining({
        routeId: 'gmb-hki-2006408-1',
        stopSequence: 2,
        arrivalSequence: 1,
        destinationEn: 'Central',
        destinationZh: '\u4e2d\u74b0',
        eta: '2026-08-28T06:14:00.000Z',
        remarkEn: 'At stop',
        dataTimestamp: '2026-08-28T06:10:31.000Z',
    }))
  })

  it('omits disabled and invalid ETA entries', () => {
    expect(normalizeGmbEta({
      generated_timestamp: '2026-08-28T14:10:31+08:00',
      data: [{ enabled: false, eta: [{ eta_seq: 1, timestamp: '2026-08-28T14:14:00+08:00' }] }, { enabled: true, eta: [{ eta_seq: 1, timestamp: 'invalid' }] }],
    }, { routeId: 'gmb-hki-2006408-1', stopSequence: 1, destinationEn: 'Central', destinationZh: '\u4e2d\u74b0' })).toEqual([])
  })

  it('loads one bounded route sample from the official endpoint shapes', async () => {
    const calls: string[] = []
    const routes = await loadGmbRoutes(async path => {
      calls.push(path)
      if (path.endsWith('/route/HKI/1')) return { data: { route_id: 2006408, region: 'HKI', route_code: '1', directions: [{ route_seq: 1, orig_tc: '山頂', orig_en: 'The Peak', dest_tc: '中環', dest_en: 'Central' }] } }
      if (path.endsWith('/route-stop/2006408/1')) return { data: Array.from({ length: gmbStopLimit + 1 }, (_, index) => ({ stop_seq: index + 1, stop_id: 20014489 + index, name_tc: `站${index + 1}`, name_en: `Stop ${index + 1}` })) }
      const stopId = Number(path.split('/').at(-1))
      return { data: { coordinates: { wgs84: { latitude: 22.27 + stopId / 1000000, longitude: 114.14 + stopId / 1000000 } } } }
    })

    expect(routes[0].stopIds).toHaveLength(gmbStopLimit)
    expect(calls).toHaveLength(2 + gmbStopLimit)
    expect(calls.filter(path => path.includes('/stop/'))).toHaveLength(gmbStopLimit)
  })

  it('loads bounded ETA requests for each sampled direction and merges arrivals', async () => {
    const calls: string[] = []
    const feed = await loadGmbFeed(async path => {
      calls.push(path)
      if (path.endsWith('/route/HKI/1')) return { data: { route_id: 2006408, region: 'HKI', route_code: '1', directions: [{ route_seq: 1, orig_tc: '山頂', orig_en: 'The Peak', dest_tc: '中環', dest_en: 'Central' }, { route_seq: 2, orig_tc: '中環', orig_en: 'Central', dest_tc: '山頂', dest_en: 'The Peak' }] } }
      if (path.includes('/eta/route-stop/')) return { generated_timestamp: '2026-08-28T14:10:31+08:00', data: [{ enabled: true, eta: [{ eta_seq: 1, timestamp: '2026-08-28T14:14:00+08:00' }] }] }
      if (path.includes('/route-stop/')) return { data: [{ stop_seq: 1, stop_id: 20014489, name_tc: '站一', name_en: 'Stop 1' }, { stop_seq: 2, stop_id: 20014490, name_tc: '站二', name_en: 'Stop 2' }] }
      return { data: { coordinates: { wgs84: { latitude: 22.27, longitude: 114.14 } } } }
    })

    expect(feed.routes).toHaveLength(2)
    expect(feed.busArrivals).toHaveLength(4)
    expect(calls.filter(path => path.includes('/eta/route-stop/'))).toHaveLength(4)
  })

  it('keeps route geometry when one bounded ETA request fails', async () => {
    const feed = await loadGmbFeed(async path => {
      if (path.endsWith('/route/HKI/1')) return { data: { route_id: 2006408, region: 'HKI', route_code: '1', directions: [{ route_seq: 1, orig_tc: '山頂', orig_en: 'The Peak', dest_tc: '中環', dest_en: 'Central' }] } }
      if (path.includes('/eta/route-stop/') && path.endsWith('/2')) throw new Error('provider timeout')
      if (path.includes('/eta/route-stop/')) return { generated_timestamp: '2026-08-28T14:10:31+08:00', data: [{ enabled: true, eta: [{ eta_seq: 1, timestamp: '2026-08-28T14:14:00+08:00' }] }] }
      if (path.includes('/route-stop/')) return { data: [{ stop_seq: 1, stop_id: 20014489, name_tc: '站一', name_en: 'Stop 1' }, { stop_seq: 2, stop_id: 20014490, name_tc: '站二', name_en: 'Stop 2' }] }
      return { data: { coordinates: { wgs84: { latitude: 22.27, longitude: 114.14 } } } }
    })

    expect(feed.routes).toHaveLength(1)
    expect(feed.busArrivals).toHaveLength(1)
  })

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
