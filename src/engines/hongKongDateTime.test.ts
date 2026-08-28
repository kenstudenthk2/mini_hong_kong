import { describe, expect, it } from 'vitest'
import { hongKongDateTimeInputValue, hongKongDateTimeInputToInstant } from './hongKongTime'

describe('Hong Kong date-time input', () => {
  it('round-trips a simulation instant as Hong Kong wall time', () => {
    const instant = hongKongDateTimeInputToInstant('2026-08-28T18:30')
    if (!instant) throw new Error('expected valid Hong Kong date-time')
    expect(hongKongDateTimeInputValue(instant)).toBe('2026-08-28T18:30')
  })

  it('rejects malformed or impossible input', () => {
    expect(hongKongDateTimeInputToInstant('')).toBeNull()
    expect(hongKongDateTimeInputToInstant('2026-02-30T18:30')).toBeNull()
    expect(hongKongDateTimeInputToInstant('2026-08-28')).toBeNull()
  })
})
