import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:test', configurable: true })
})

import { selectedVehicleCenter, shouldClearVehicleSelection } from './MapView'
import type { VehiclePosition } from '../../types'

const vehicle: VehiclePosition = {
  id: 'mtr-1',
  type: 'mtr',
  lineId: 'mtr-east-rail',
  tripId: 'trip-1',
  color: '#38bdf8',
  coordinates: [114.16, 22.33],
  bearing: 90,
  progress: 0.4,
  labelEn: 'MTR train',
  labelZh: '港鐵列車',
  labelPt: 'Comboio MTR',
  nextStopId: null,
  destinationId: null,
}

describe('selected vehicle map focus', () => {
  it('returns the selected vehicle center', () => {
    expect(selectedVehicleCenter([vehicle], 'mtr-1')).toEqual([114.16, 22.33])
  })

  it('does not move the map for a missing or cleared selection', () => {
    expect(selectedVehicleCenter([vehicle], 'missing')).toBeNull()
    expect(selectedVehicleCenter([vehicle], null)).toBeNull()
  })

  it('clears selection only when empty map space was clicked', () => {
    expect(shouldClearVehicleSelection(0)).toBe(true)
    expect(shouldClearVehicleSelection(1)).toBe(false)
  })
})
