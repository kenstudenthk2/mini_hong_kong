import { describe, expect, it } from 'vitest'
import { searchRoutes } from './routeSearch'
import type { BusRoute } from '../types'

const routes: BusRoute[] = [
  { id: 'kmb-1-o', operator: 'KMB/LWB', routeNumber: '1', color: '#0f766e', nameEn: 'Chuk Yuen - Star Ferry', nameZh: '\u7af9\u5712 - \u5929\u661f\u5c0f\u8f2a', geometry: [], stopIds: [] },
  { id: 'citybus-10-o', operator: 'Citybus', routeNumber: '10', color: '#dc2626', nameEn: 'North Point - Wah Fu', nameZh: '\u5317\u89d2 - \u83ef\u5bcc', geometry: [], stopIds: [] },
]

describe('route search', () => {
  it('matches route IDs, operators, and localized names', () => {
    expect(searchRoutes(routes, 'citybus', 'en').map(route => route.id)).toEqual(['citybus-10-o'])
    expect(searchRoutes(routes, '\u83ef\u5bcc', 'zh').map(route => route.id)).toEqual(['citybus-10-o'])
  })

  it('returns all routes for an empty query', () => {
    expect(searchRoutes(routes, '  ', 'en')).toEqual(routes)
  })
})
