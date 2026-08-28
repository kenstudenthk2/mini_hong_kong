import type { AirportFacility } from '../types'

export const HKG_AIP_SOURCE = 'https://www.ais.gov.hk/eaip_20260709/2026-07-09-000000/html/eAIP/VH-AD-2-VHHH-en-US.html'

export interface AirportRunway {
  id: string
  designator: string
  geometry: [number, number][]
  sourceUrl: string
}

// Aerodrome reference point from the Hong Kong AIP AD 2.2, converted from DMS.
export const hkiaFacility: AirportFacility = {
  id: 'hkg-hkia',
  iataCode: 'HKG',
  icaoCode: 'VHHH',
  nameEn: 'Hong Kong International Airport',
  nameZh: '香港國際機場',
  coordinates: [113.9147222, 22.3088889],
  sourceUrl: HKG_AIP_SOURCE,
}

export const hkiaRunways: AirportRunway[] = [
  {
    id: 'hkg-rwy-07l-25r',
    designator: '07L/25R',
    geometry: [[113.8822944, 22.3215889], [113.9139556, 22.3317917]],
    sourceUrl: HKG_AIP_SOURCE,
  },
  {
    id: 'hkg-rwy-07c-25c',
    designator: '07C/25C',
    geometry: [[113.8990667, 22.3112722], [113.9268833, 22.3202361]],
    sourceUrl: HKG_AIP_SOURCE,
  },
  {
    id: 'hkg-rwy-07r-25l',
    designator: '07R/25L',
    geometry: [[113.8994417, 22.296675], [113.9328194, 22.3074306]],
    sourceUrl: HKG_AIP_SOURCE,
  },
]
