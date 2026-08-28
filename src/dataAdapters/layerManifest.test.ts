import { describe, expect, it } from 'vitest'
import { layerManifest } from './layerManifest'

describe('layer manifest', () => {
  it('registers each visible directory domain once', () => {
    const ids = layerManifest.map(entry => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(['mtr', 'light-rail', 'buses', 'gmb', 'ferries', 'trams', 'flights', 'hkia-aip', 'hkia-ground'])
  })

  it('distinguishes scheduled feeds from replay and static context', () => {
    expect(layerManifest.find(entry => entry.id === 'flights')?.dataClass).toBe('replay')
    expect(layerManifest.find(entry => entry.id === 'buses')?.dataClass).toBe('live')
    expect(layerManifest.find(entry => entry.id === 'gmb')?.dataClass).toBe('live')
    expect(layerManifest.find(entry => entry.id === 'hkia-aip')?.dataClass).toBe('static')
  })

  it('links externally loaded transport layers to their Hong Kong source hubs', () => {
    expect(layerManifest.find(entry => entry.id === 'buses')?.sourceUrl).toBe('https://data.gov.hk/en/')
    expect(layerManifest.find(entry => entry.id === 'gmb')?.sourceUrl).toBe('https://data.gov.hk/en-data/dataset/hk-td-sm_7-real-time-arrival-data-of-gmb')
    expect(layerManifest.find(entry => entry.id === 'ferries')?.sourceUrl).toBe('https://static.data.gov.hk/td/pt-headway-en/')
    expect(layerManifest.find(entry => entry.id === 'trams')?.sourceUrl).toBe('https://static.data.gov.hk/td/pt-headway-en/')
  })

  it('provides labels and source names for every supported locale', () => {
    for (const entry of layerManifest) {
      expect(entry.labelEn).toBeTruthy()
      expect(entry.labelZh).toBeTruthy()
      expect(entry.labelPt).toBeTruthy()
      expect(entry.sourceLabelEn).toBeTruthy()
      expect(entry.sourceLabelZh).toBeTruthy()
      expect(entry.sourceLabelPt).toBeTruthy()
    }
  })
})
