import { describe, expect, it } from 'vitest'
import { normalizeCitybusRoutes } from './citybus'

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
