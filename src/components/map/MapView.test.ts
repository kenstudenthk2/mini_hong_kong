import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:test', configurable: true })
})

import { DEFAULT_MAP_VIEW, basemapVisibilityForPitch, isClearSelectionShortcut, selectedRouteBounds, selectedRouteCenter, selectedRouteGeometry, selectedVehicleCenter, shouldClearVehicleSelection } from './MapView'
import type { RailLine, VehiclePosition } from '../../types'

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
  it('uses the dark basemap for 3D and the light basemap for 2D', () => {
    expect(basemapVisibilityForPitch(true)).toEqual({ light: 'none', dark: 'visible' })
    expect(basemapVisibilityForPitch(false)).toEqual({ light: 'visible', dark: 'none' })
  })

  it('starts over the dense urban transit area for the 3D city view', () => {
    expect(DEFAULT_MAP_VIEW).toMatchObject({ center: [114.16, 22.32], zoom: 12.4, pitch: 58 })
  })

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

  it('recognizes Escape as the clear-selection shortcut', () => {
    expect(isClearSelectionShortcut({ code: 'Escape' })).toBe(true)
    expect(isClearSelectionShortcut({ code: 'Space' })).toBe(false)
  })

  it('returns the first geometry point for a selected route', () => {
    const route: RailLine = { id: 'mtr-east', geometry: [[114.1, 22.3]], nameEn: 'East Rail', nameZh: '\u6771\u9435', mode: 'mtr', color: '#38bdf8', operator: 'MTR', stationIds: [] }
    expect(selectedRouteCenter([route], 'mtr-east')).toEqual([114.1, 22.3])
    expect(selectedRouteCenter([route], 'missing')).toBeNull()
    expect(selectedRouteCenter([route], null)).toBeNull()
    expect(selectedRouteGeometry([route], 'mtr-east')).toEqual([[114.1, 22.3]])
    expect(selectedRouteGeometry([route], 'missing')).toEqual([])
    expect(selectedRouteBounds([route], 'mtr-east')).toEqual([[114.1, 22.3], [114.1, 22.3]])
    expect(selectedRouteBounds([route], 'missing')).toBeNull()
  })
})
