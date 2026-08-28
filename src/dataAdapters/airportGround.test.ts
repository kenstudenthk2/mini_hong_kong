import { describe, expect, it } from 'vitest'
import { HKIA_OSM_SOURCE, HKIA_OSM_TIMESTAMP, hkiaGroundFeatures } from './airportGround'

describe('hkiaGroundFeatures', () => {
  it('contains pinned terminal and gate context from the OSM snapshot', () => {
    expect(hkiaGroundFeatures.filter(feature => feature.kind === 'terminal').map(feature => feature.ref)).toEqual(['T1', 'T2'])
    expect(hkiaGroundFeatures.filter(feature => feature.kind === 'gate')).toHaveLength(8)
    expect(hkiaGroundFeatures.every(feature => feature.sourceUrl === HKIA_OSM_SOURCE && feature.sourceTimestamp === HKIA_OSM_TIMESTAMP)).toBe(true)
  })

  it('keeps the terminal points inside the HKIA map context', () => {
    const terminals = hkiaGroundFeatures.filter(feature => feature.kind === 'terminal')
    expect(terminals.every(feature => feature.coordinates[0] > 113.9 && feature.coordinates[0] < 113.96)).toBe(true)
    expect(terminals.every(feature => feature.coordinates[1] > 22.3 && feature.coordinates[1] < 22.34)).toBe(true)
  })
})
