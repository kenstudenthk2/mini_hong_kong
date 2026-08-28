import { describe, expect, it } from 'vitest'
import { flightForVehicle, infoLabel, routeForVehicle, stationLineNames } from './InfoPanel'
import type { TransitData, VehiclePosition } from '../../types'

const flightVehicle: VehiclePosition = {
  id: 'flight-replay',
  type: 'flight',
  lineId: 'hkg-rwy-07l-25r',
  tripId: '2026-08-28-departure-passenger-4',
  color: '#f97316',
  coordinates: [113.9, 22.3],
  bearing: 90,
  progress: 0.5,
  labelEn: 'HX246 - HKIA movement replay',
  labelZh: 'HX246 - 香港國際機場移動重播',
  labelPt: 'HX246 - Repeticao de movimento HKIA',
  nextStopId: null,
  destinationId: null,
}

describe('flight info resolution', () => {
  it('provides localized station and progress labels', () => {
    expect(infoLabel('en', 'station')).toBe('Station')
    expect(infoLabel('zh', 'coordinates')).toBe('\u5ea7\u6a19')
    expect(infoLabel('pt', 'progress')).toBe('Progresso')
  })

  it('resolves localized station line names with an ID fallback', () => {
    const station = { id: 's1', nameEn: 'Central', nameZh: '\u4e2d\u74b0', namePt: 'Central', coordinates: [114, 22] as [number, number], lineIds: ['mtr-east', 'unknown'] }
    const data = { railLines: [{ id: 'mtr-east', nameEn: 'East Rail Line', nameZh: '\u6771\u9435\u7dda', namePt: 'Linha East Rail', mode: 'mtr', color: '#38bdf8', operator: 'MTR', stationIds: [], geometry: [] }] } as unknown as TransitData
    expect(stationLineNames(data, station, 'zh')).toEqual(['\u6771\u9435\u7dda', 'unknown'])
  })

  it('resolves the normalized flight record from a replay vehicle', () => {
    const data = { flights: [{ id: flightVehicle.tripId, flightNumbers: ['HX246'] }] } as TransitData
    expect(flightForVehicle(data, flightVehicle)?.flightNumbers).toEqual(['HX246'])
  })

  it('does not resolve a flight for another vehicle or missing record', () => {
    expect(flightForVehicle(null, flightVehicle)).toBeUndefined()
    expect(flightForVehicle({ flights: [] } as unknown as TransitData, flightVehicle)).toBeUndefined()
  })

  it('resolves ferry and tram routes for selected surface vehicles', () => {
    const ferry = { id: 'ferry-1', type: 'ferry', lineId: 'ferry-route-1' } as VehiclePosition
    const tram = { id: 'tram-1', type: 'tram', lineId: 'tram-route-1' } as VehiclePosition
    const data = {
      ferryRoutes: [{ id: 'ferry-route-1', operator: 'Ferry', routeNumber: '1', color: '#0284c7', nameEn: 'Central - Mui Wo', nameZh: '\u4e2d\u74b0 - \u6885\u7a9d', geometry: [], stopIds: [], journeyTimeMinutes: 35 }],
      tramRoutes: [{ id: 'tram-route-1', operator: 'Tram', routeNumber: '1', color: '#f59e0b', nameEn: 'East - West', nameZh: '\u6771 - \u897f', geometry: [], stopIds: [], journeyTimeMinutes: 12 }],
    } as unknown as TransitData
    expect(routeForVehicle(data, ferry)?.routeNumber).toBe('1')
    expect(routeForVehicle(data, tram)?.operator).toBe('Tram')
  })

  it('resolves a bus route for a selected bus vehicle', () => {
    const bus = { id: 'bus-1', type: 'bus', lineId: 'kmb-1-o' } as VehiclePosition
    const data = {
      busRoutes: [{ id: 'kmb-1-o', operator: 'KMB/LWB', routeNumber: '1', color: '#0f766e', nameEn: 'Chuk Yuen - Star Ferry', nameZh: '\u7af9\u5712 - \u5929\u661f\u5c0f\u8f2a', geometry: [], stopIds: [] }],
    } as unknown as TransitData
    expect(routeForVehicle(data, bus)?.operator).toBe('KMB/LWB')
    expect(routeForVehicle(data, bus)?.routeNumber).toBe('1')
  })
})
