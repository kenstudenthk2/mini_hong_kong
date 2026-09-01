import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import { ControlPanel, simulationTimeLocale, timelineTimeFromMinute } from './ControlPanel'
import type { SimulationClock } from '../../types'

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

describe('ControlPanel time controls', () => {
  it('shows now and manual time controls without speed or coming-time playback UI', () => {
    const clock: SimulationClock = {
      currentTime: new Date('2026-09-01T04:30:00.000Z'),
      speed: 1,
      paused: true,
      setSpeed: () => undefined,
      setPaused: () => undefined,
      syncToNow: () => undefined,
      setTime: () => undefined,
    }

    render(createElement(I18nProvider, null, createElement(ControlPanel, {
      clock,
      pitchEnabled: true,
      onTogglePitch: () => undefined,
      liveBusMode: false,
      hasLiveBusData: false,
      onToggleLiveBusMode: () => undefined,
      followSelectedVehicle: false,
      onToggleFollowSelectedVehicle: () => undefined,
    })))

    expect(screen.getByRole('button', { name: 'Now' })).toBeTruthy()
    expect(screen.getByLabelText('Simulation').getAttribute('type')).toBe('datetime-local')
    expect(screen.queryByText('Speed')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    expect(screen.queryByLabelText('Simulation timeline')).toBeNull()
  })
})
