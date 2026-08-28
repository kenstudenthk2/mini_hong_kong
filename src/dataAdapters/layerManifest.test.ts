import { describe, expect, it } from 'vitest'
import { layerManifest } from './layerManifest'

describe('layer manifest', () => {
  it('registers each visible directory domain once', () => {
    const ids = layerManifest.map(entry => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(['mtr', 'light-rail', 'buses', 'ferries', 'trams', 'flights', 'hkia-aip', 'hkia-ground'])
  })

  it('distinguishes scheduled feeds from replay and static context', () => {
    expect(layerManifest.find(entry => entry.id === 'flights')?.dataClass).toBe('replay')
    expect(layerManifest.find(entry => entry.id === 'buses')?.dataClass).toBe('live')
    expect(layerManifest.find(entry => entry.id === 'hkia-aip')?.dataClass).toBe('static')
  })
})
