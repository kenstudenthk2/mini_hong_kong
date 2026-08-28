import { describe, expect, it } from 'vitest'
import { normalizeNlbRoutes } from './nlb'

describe('NLB route adapter', () => {
  it('normalizes localized routes and ordered stop coordinates', () => {
    const routes = normalizeNlbRoutes({
      routes: [{ routeId: '1', routeNo: '1', routeName_c: '\u6885\u7aa9\u78bc\u982d > \u5927\u6fb3', routeName_e: 'Mui Wo Ferry Pier > Tai O' }],
      stopsByRoute: {
        '1': [
          { stopId: '1', stopName_c: '\u6885\u7aa9\u78bc\u982d', stopName_e: 'Mui Wo Ferry Pier', latitude: '22.26466400', longitude: '114.00155400' },
          { stopId: '2', stopName_c: '\u6885\u7aa9\u719f\u98df\u5e02\u5834', stopName_e: 'Mui Wo Cooked Food Market', latitude: '22.26614300', longitude: '114.00004900' },
        ],
      },
    })

    expect(routes).toEqual([expect.objectContaining({
      id: 'nlb-1',
      operator: 'NLB',
      routeNumber: '1',
      nameEn: 'Mui Wo Ferry Pier > Tai O',
      nameZh: '\u6885\u7aa9\u78bc\u982d > \u5927\u6fb3',
      stopIds: ['1', '2'],
      geometry: [[114.001554, 22.264664], [114.000049, 22.266143]],
    })])
  })

  it('omits routes without two valid stops', () => {
    expect(normalizeNlbRoutes({
      routes: [{ routeId: '2', routeNo: '1', routeName_c: 'A', routeName_e: 'A' }],
      stopsByRoute: { '2': [{ stopId: '1', stopName_c: 'A', stopName_e: 'A', latitude: 22.2, longitude: 114 }] },
    })).toEqual([])
  })
})
