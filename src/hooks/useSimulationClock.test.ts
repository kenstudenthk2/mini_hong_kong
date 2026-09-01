import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { isPlaybackShortcut, useSimulationClock } from './useSimulationClock'

describe('simulation playback shortcut', () => {
  it('accepts one spacebar press outside form controls', () => {
    expect(isPlaybackShortcut({ code: 'Space', repeat: false, target: document.body })).toBe(true)
  })

  it('ignores repeats and form controls', () => {
    expect(isPlaybackShortcut({ code: 'Space', repeat: true, target: document.body })).toBe(false)
    const input = document.createElement('input')
    expect(isPlaybackShortcut({ code: 'Space', repeat: false, target: input })).toBe(false)
  })
})

describe('useSimulationClock', () => {
  it('starts at current time without accelerated playback', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T04:30:00.000Z'))

    const { result } = renderHook(() => useSimulationClock())

    expect(result.current.currentTime.toISOString()).toBe('2026-09-01T04:30:00.000Z')
    expect(result.current.speed).toBe(1)
    expect(result.current.paused).toBe(false)

    vi.useRealTimers()
  })
})
