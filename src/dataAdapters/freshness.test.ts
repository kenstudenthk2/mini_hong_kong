import { describe, expect, it } from 'vitest'
import { classifyFreshness } from './freshness'

describe('classifyFreshness', () => {
  const now = new Date('2026-08-28T04:00:00.000Z')

  it('accepts a source timestamp inside the freshness window', () => {
    expect(classifyFreshness('2026-08-28T03:59:30.000Z', now, 1)).toBe('fresh')
  })

  it('marks a source timestamp outside the freshness window as stale', () => {
    expect(classifyFreshness('2026-08-28T03:57:59.000Z', now, 1)).toBe('stale')
  })

  it('rejects malformed timestamps as invalid', () => {
    expect(classifyFreshness('not-a-timestamp', now, 1)).toBe('invalid')
  })
})
