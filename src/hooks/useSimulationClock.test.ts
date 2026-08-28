import { describe, expect, it } from 'vitest'
import { isPlaybackShortcut } from './useSimulationClock'

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
