import { describe, expect, it } from 'vitest'
import { citybusFeaturedRouteNumbers, normalizeCitybusEta, normalizeCitybusRoutes, selectCitybusRoutes } from './citybus'

describe('normalizeCitybusEta', () => {
  it('normalizes ETA records and skips records without an ETA', () => {
    expect(normalizeCitybusEta({
      generated_timestamp: '2026-08-28T10:40:00+08:00',
      data: [
        {
          co: 'CTB', route: '1', dir: 'O', seq: 2, stop: '002737',
          dest_en: 'Happy Valley (Upper)', dest_tc: '跑馬地 (上)', eta_seq: 1,
          eta: '2026-08-28T10:45:00+08:00', rmk_en: '',
          data_timestamp: '2026-08-28T10:40:00+08:00',
        },
        {
          co: 'CTB', route: '1', dir: 'O', seq: 2, stop: '002737',
          dest_en: 'Happy Valley (Upper)', dest_tc: '跑馬地 (上)', eta_seq: 2,
          eta: '', rmk_en: 'No GPS data',
          data_timestamp: '2026-08-28T10:40:00+08:00',
        },
      ],
    })).toEqual([{
      id: 'citybus-1-o-eta-2-1',
      routeId: 'citybus-1-o',
      stopSequence: 2,
      arrivalSequence: 1,
      destinationEn: 'Happy Valley (Upper)',
      destinationZh: '跑馬地 (上)',
      eta: '2026-08-28T10:45:00+08:00',
      remarkEn: '',
      dataTimestamp: '2026-08-28T10:40:00+08:00',
    }])
  })
})

describe('selectCitybusRoutes', () => {
  it('selects the configured representative routes in stable order', () => {
    const routes = citybusFeaturedRouteNumbers.map(route => ({
      co: 'CTB' as const, route,
      orig_en: 'A', orig_tc: '甲', dest_en: 'B', dest_tc: '乙',
    })).reverse()

    expect(selectCitybusRoutes(routes).map(route => route.route)).toEqual(citybusFeaturedRouteNumbers)
  })
})

describe('normalizeCitybusRoutes', () => {
  it('normalizes Citybus route directions, ordered stops, names, and coordinates', () => {
    const routes = normalizeCitybusRoutes({
      generatedAt: '2026-08-28T10:29:40+08:00',
      routes: [{
        co: 'CTB', route: '1',
        orig_en: 'Central (Macao Ferry)', orig_tc: '中環 (港澳碼頭)',
        dest_en: 'Happy Valley (Upper)', dest_tc: '跑馬地 (上)',
      }],
      routeStops: [
        { co: 'CTB', route: '1', dir: 'O', seq: 2, stop: '002738' },
        { co: 'CTB', route: '1', dir: 'O', seq: 1, stop: '002737' },
      ],
      stops: [
        { stop: '002737', name_en: 'Pottinger Street', name_tc: '砵典乍街', lat: 22.283948, long: 114.156309 },
        { stop: '002738', name_en: 'Central', name_tc: '中環', lat: 22.2845, long: 114.157 },
      ],
    })

    expect(routes).toEqual([{
      id: 'citybus-1-o',
      operator: 'Citybus',
      routeNumber: '1',
      nameEn: 'Central (Macao Ferry) - Happy Valley (Upper)',
      nameZh: '中環 (港澳碼頭) - 跑馬地 (上)',
      color: '#dc2626',
      stopIds: ['002737', '002738'],
      geometry: [[114.156309, 22.283948], [114.157, 22.2845]],
    }])
  })

  it('omits a direction when a stop coordinate is unavailable', () => {
    expect(normalizeCitybusRoutes({
      generatedAt: '2026-08-28T10:29:40+08:00',
      routes: [{
        co: 'CTB', route: '1', orig_en: 'A', orig_tc: '甲', dest_en: 'B', dest_tc: '乙',
      }],
      routeStops: [
        { co: 'CTB', route: '1', dir: 'I', seq: 1, stop: '000001' },
        { co: 'CTB', route: '1', dir: 'I', seq: 2, stop: '000002' },
      ],
      stops: [{ stop: '000001', name_en: 'A', name_tc: '甲', lat: 22.3, long: 114.1 }],
    })).toEqual([])
  })
})
