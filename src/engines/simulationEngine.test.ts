import { describe, expect, it } from 'vitest'
import type { BusRoute, BusSchedule, TransitData } from '../types'
import { computeBusVehiclePositions, computeBusVehiclePositionsFromEta, computeVehiclePositions, getScheduleType } from './simulationEngine'
import { hongKongWallToInstant } from './hongKongTime'
import { interpolateOnLine } from './geometry'

const fixture: TransitData = {
  railLines: [{
    id: 'test-line',
    mode: 'mtr',
    nameEn: 'Test Line',
    nameZh: '測試綫',
    namePt: 'Linha de Teste',
    color: '#ff0000',
    operator: 'MTR',
    stationIds: ['a', 'b', 'c'],
    geometry: [[114, 22], [114.1, 22], [114.2, 22]],
  }],
  stations: [
    { id: 'a', nameEn: 'A', nameZh: '甲', coordinates: [114, 22], lineIds: ['test-line'] },
    { id: 'b', nameEn: 'B', nameZh: '乙', coordinates: [114.1, 22], lineIds: ['test-line'] },
    { id: 'c', nameEn: 'C', nameZh: '丙', coordinates: [114.2, 22], lineIds: ['test-line'] },
  ],
  trips: [{
    id: 'test-out',
    lineId: 'test-line',
    direction: 'outbound',
    scheduleType: 'weekday',
    startMinutes: 360,
    endMinutes: 420,
    headwayMinutes: 10,
    durationMinutes: 20,
    dwellMinutes: 1,
    stopIds: ['a', 'b', 'c'],
  }],
}

const busRoute: BusRoute = {
  id: 'kmb-1-o-1',
  operator: 'KMB/LWB',
  routeNumber: '1',
  nameEn: 'CHUK YUEN ESTATE - STAR FERRY',
  nameZh: '竹園邨 - 尖沙咀碼頭',
  color: '#0f766e',
  stopIds: ['a', 'b', 'c'],
  geometry: [[114, 22], [114.1, 22], [114.2, 22]],
}

const busSchedule: BusSchedule = {
  id: 'kmb-1-o-1-schedule',
  routeId: busRoute.id,
  scheduleType: 'weekday',
  startMinutes: 360,
  endMinutes: 420,
  headwayMinutes: 10,
  durationMinutes: 20,
  dwellMinutes: 1,
}

describe('Hong Kong schedule type', () => {
  it('returns weekday for Hong Kong Monday', () => {
    expect(getScheduleType(hongKongWallToInstant(2026, 7, 24, 12, 0))).toBe('weekday')
  })

  it('returns weekend for Hong Kong Sunday', () => {
    expect(getScheduleType(hongKongWallToInstant(2026, 7, 23, 12, 0))).toBe('weekend')
  })
})

describe('line interpolation', () => {
  it('interpolates start, midpoint, and end', () => {
    const line = [[114, 22], [114.2, 22]] as [number, number][]
    expect(interpolateOnLine(line, 0).coordinates[0]).toBeCloseTo(114)
    expect(interpolateOnLine(line, 0.5).coordinates[0]).toBeCloseTo(114.1)
    expect(interpolateOnLine(line, 1).coordinates[0]).toBeCloseTo(114.2)
  })
})

describe('computeVehiclePositions', () => {
  it('creates a vehicle for an active trip', () => {
    const vehicles = computeVehiclePositions(fixture, hongKongWallToInstant(2026, 7, 24, 6, 10))
    expect(vehicles).toHaveLength(2)
    expect(vehicles[0].nextStopId).toBeTruthy()
  })

  it('does not create weekend vehicles from weekday trips', () => {
    const vehicles = computeVehiclePositions(fixture, hongKongWallToInstant(2026, 7, 23, 6, 10))
    expect(vehicles).toHaveLength(0)
  })

  it('honors station dwell at departure', () => {
    const vehicles = computeVehiclePositions(fixture, hongKongWallToInstant(2026, 7, 24, 6, 0))
    expect(vehicles[0].progress).toBe(0)
    expect(vehicles[0].nextStopId).toBe('b')
  })

  it('dwells at the named station coordinate on unequal segments', () => {
    const vehicles = computeVehiclePositions(fixture, hongKongWallToInstant(2026, 7, 24, 6, 10))
    expect(vehicles[0].coordinates[0]).toBeCloseTo(114.1)
    expect(vehicles[0].coordinates[1]).toBeCloseTo(22)
  })

  it('uses the previous operational day after midnight', () => {
    const overnightFixture = {
      ...fixture,
      trips: [{ ...fixture.trips[0], endMinutes: 1500 }],
    }
    const vehicles = computeVehiclePositions(overnightFixture, hongKongWallToInstant(2026, 7, 25, 0, 30))
    expect(vehicles.length).toBeGreaterThan(0)
  })
})

describe('computeBusVehiclePositions', () => {
  it('creates headway-based vehicles and interpolates along the bus route', () => {
    const vehicles = computeBusVehiclePositions([busRoute], [busSchedule], hongKongWallToInstant(2026, 7, 24, 6, 10))

    expect(vehicles).toHaveLength(2)
    expect(vehicles[0].type).toBe('bus')
    expect(vehicles[0].coordinates[0]).toBeCloseTo(114.1)
    expect(vehicles[0].nextStopId).toBe('c')
    expect(vehicles[0].destinationId).toBe('c')
  })

  it('does not start a weekday schedule on a weekend', () => {
    const vehicles = computeBusVehiclePositions([busRoute], [busSchedule], hongKongWallToInstant(2026, 7, 23, 6, 10))
    expect(vehicles).toHaveLength(0)
  })
})

describe('computeBusVehiclePositionsFromEta', () => {
  it('interpolates a predicted bus between adjacent stop ETAs', () => {
    const vehicles = computeBusVehiclePositionsFromEta([busRoute], [
      { id: 'a', routeId: busRoute.id, stopSequence: 1, arrivalSequence: 1, destinationEn: 'STAR FERRY', destinationZh: '尖沙咀碼頭', eta: '2026-08-28T06:00:00+08:00', remarkEn: '', dataTimestamp: '2026-08-28T05:59:00+08:00' },
      { id: 'b', routeId: busRoute.id, stopSequence: 2, arrivalSequence: 1, destinationEn: 'STAR FERRY', destinationZh: '尖沙咀碼頭', eta: '2026-08-28T06:10:00+08:00', remarkEn: '', dataTimestamp: '2026-08-28T05:59:00+08:00' },
      { id: 'c', routeId: busRoute.id, stopSequence: 3, arrivalSequence: 1, destinationEn: 'STAR FERRY', destinationZh: '尖沙咀碼頭', eta: '2026-08-28T06:20:00+08:00', remarkEn: '', dataTimestamp: '2026-08-28T05:59:00+08:00' },
    ], hongKongWallToInstant(2026, 7, 28, 6, 15))

    expect(vehicles).toHaveLength(1)
    expect(vehicles[0].coordinates[0]).toBeCloseTo(114.15)
    expect(vehicles[0].nextStopId).toBe('c')
    expect(vehicles[0].destinationId).toBe('c')
  })

  it('skips predictions that do not yet have a following stop ETA', () => {
    const vehicles = computeBusVehiclePositionsFromEta([busRoute], [{
      id: 'a', routeId: busRoute.id, stopSequence: 1, arrivalSequence: 1, destinationEn: 'STAR FERRY', destinationZh: '尖沙咀碼頭', eta: '2026-08-28T06:10:00+08:00', remarkEn: '', dataTimestamp: '2026-08-28T05:59:00+08:00',
    }], hongKongWallToInstant(2026, 7, 24, 6, 15))
    expect(vehicles).toHaveLength(0)
  })
})
