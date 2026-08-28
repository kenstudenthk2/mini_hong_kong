import { describe, expect, it } from 'vitest'
import { simulationTimeLocale } from './ControlPanel'

describe('simulation clock locale', () => {
  it('uses the active trilingual locale for the time readout', () => {
    expect(simulationTimeLocale('en')).toBe('en-GB')
    expect(simulationTimeLocale('zh')).toBe('zh-HK')
    expect(simulationTimeLocale('pt')).toBe('pt-PT')
  })
})
