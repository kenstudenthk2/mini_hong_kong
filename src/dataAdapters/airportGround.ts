import type { Coordinate } from '../types'

export const HKIA_OSM_SOURCE = 'https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3B%28nwr%5B%22aeroway%22~%22terminal%7Capron%7Cgate%7Cparking_position%22%5D%2822.29%2C113.89%2C22.34%2C113.95%29%3B%29%3Bout%20center%3B'
export const HKIA_OSM_TIMESTAMP = '2026-08-28T03:58:21Z'

export interface AirportGroundFeature {
  id: string
  kind: 'terminal' | 'gate'
  ref: string
  nameEn: string
  nameZh: string
  namePt: string
  coordinates: Coordinate
  sourceUrl: string
  sourceTimestamp: string
}

// Pinned representative points from the OSM snapshot. They provide airport context,
// while the AIP remains the source for runway geometry and movement replay.
export const hkiaGroundFeatures: AirportGroundFeature[] = [
  {
    id: 'osm-relation-17288284',
    kind: 'terminal',
    ref: 'T1',
    nameEn: 'Terminal 1',
    nameZh: '\u4e00\u865f\u5ba2\u904b\u5927\u6a13',
    namePt: 'Terminal 1',
    coordinates: [113.9265103, 22.3127230],
    sourceUrl: HKIA_OSM_SOURCE,
    sourceTimestamp: HKIA_OSM_TIMESTAMP,
  },
  {
    id: 'osm-way-1204348925',
    kind: 'terminal',
    ref: 'T2',
    nameEn: 'Terminal 2',
    nameZh: '\u4e8c\u865f\u5ba2\u904b\u5927\u6a13',
    namePt: 'Terminal 2',
    coordinates: [113.9385142, 22.3165529],
    sourceUrl: HKIA_OSM_SOURCE,
    sourceTimestamp: HKIA_OSM_TIMESTAMP,
  },
  ...[
    ['1', 113.9347913, 22.3136863],
    ['2', 113.9350205, 22.3130688],
    ['3', 113.9352521, 22.3124449],
    ['4', 113.9355499, 22.3124009],
    ['5', 113.9337156, 22.3165323],
    ['6', 113.9333920, 22.3173936],
    ['7', 113.9331715, 22.3179804],
    ['8', 113.9331971, 22.3181537],
  ].map(([ref, longitude, latitude]) => ({
    id: `osm-gate-${ref}`,
    kind: 'gate' as const,
    ref: String(ref),
    nameEn: `Gate ${ref}`,
    nameZh: `\u767b\u6a5f\u9580 ${ref}`,
    namePt: `Porta ${ref}`,
    coordinates: [Number(longitude), Number(latitude)] as Coordinate,
    sourceUrl: HKIA_OSM_SOURCE,
    sourceTimestamp: HKIA_OSM_TIMESTAMP,
  })),
]
