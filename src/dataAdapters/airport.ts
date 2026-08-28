import type { AirportFacility } from '../types'

export const HKG_AIP_SOURCE = 'https://www.ais.gov.hk/eaip_20250515/2025-05-15-000000/html/eAIP/VH-AD-2-VHHH-en-US.html'

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
