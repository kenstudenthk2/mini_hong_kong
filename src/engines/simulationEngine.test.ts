import { describe, expect, it } from 'vitest'
import type { TransitData } from '../types'
import { computeVehiclePositions, getScheduleType } from './simulationEngine'
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
