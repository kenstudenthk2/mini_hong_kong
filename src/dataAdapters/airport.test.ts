import { describe, expect, it } from 'vitest'
import { HKG_AIP_SOURCE, hkiaFacility, hkiaRunways } from './airport'

describe('hkiaFacility', () => {
  it('contains the official HKG/VHHH aerodrome reference point', () => {
    expect(hkiaFacility).toMatchObject({
      id: 'hkg-hkia',
      iataCode: 'HKG',
      icaoCode: 'VHHH',
      coordinates: [113.9147222, 22.3088889],
      sourceUrl: HKG_AIP_SOURCE,
    })
  })

  it('keeps the facility within the Hong Kong map extent', () => {
    expect(hkiaFacility.coordinates[0]).toBeGreaterThan(113.8)
    expect(hkiaFacility.coordinates[0]).toBeLessThan(114.1)
    expect(hkiaFacility.coordinates[1]).toBeGreaterThan(22.2)
    expect(hkiaFacility.coordinates[1]).toBeLessThan(22.5)
  })

  it('contains all three current HKIA runway centerlines from the AIP thresholds', () => {
    expect(hkiaRunways.map(runway => runway.designator)).toEqual(['07L/25R', '07C/25C', '07R/25L'])
    expect(hkiaRunways.every(runway => runway.geometry.length === 2 && runway.sourceUrl === HKG_AIP_SOURCE)).toBe(true)
    expect(hkiaRunways[2].geometry).toEqual([[113.8994417, 22.296675], [113.9328194, 22.3074306]])
  })
})
