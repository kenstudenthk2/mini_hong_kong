import { describe, expect, it } from 'vitest'
import { simulationTimeLocale, timelineTimeFromMinute } from './ControlPanel'

describe('simulation clock locale', () => {
  it('uses the active trilingual locale for the time readout', () => {
    expect(simulationTimeLocale('en')).toBe('en-GB')
    expect(simulationTimeLocale('zh')).toBe('zh-HK')
    expect(simulationTimeLocale('pt')).toBe('pt-PT')
  })
})

describe('timelineTimeFromMinute', () => {
  it('keeps the selected Hong Kong calendar day while changing the time', () => {
    const result = timelineTimeFromMinute(new Date('2026-08-28T04:00:00.000Z'), 930)

    expect(result.toISOString()).toBe('2026-08-28T07:30:00.000Z')
  })
})
