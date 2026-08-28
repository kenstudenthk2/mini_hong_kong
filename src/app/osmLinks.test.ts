import { describe, expect, it } from 'vitest'
import { openStreetMapMarkerUrl } from './osmLinks'

describe('openStreetMapMarkerUrl', () => {
  it('creates a shareable OSM map URL with a marker and map view', () => {
    expect(openStreetMapMarkerUrl([114.1694, 22.3193])).toBe(
      'https://www.openstreetmap.org/?mlat=22.3193&mlon=114.1694#map=16/22.3193/114.1694',
    )
  })

  it('allows a caller to choose the detail zoom', () => {
    expect(openStreetMapMarkerUrl([114, 22.3], 12)).toContain('#map=12/22.3/114')
  })
})
