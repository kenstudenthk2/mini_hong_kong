import { HKG_AIP_SOURCE } from './airport'
import { HKIA_OSM_SOURCE } from './airportGround'

export type LayerDataClass = 'static' | 'scheduled' | 'live' | 'replay'

export interface LayerManifestEntry {
  id: string
  section: 'rail' | 'lightRail' | 'buses' | 'ferries' | 'trams' | 'flights' | 'dataStatus'
  label: string
  dataClass: LayerDataClass
  sourceLabel: string
  sourceUrl?: string
}

// One compact registry keeps the directory's visible domains auditable.
export const layerManifest: LayerManifestEntry[] = [
  { id: 'mtr', section: 'rail', label: 'MTR', dataClass: 'scheduled', sourceLabel: 'Local timetable assets' },
  { id: 'light-rail', section: 'lightRail', label: 'Light Rail', dataClass: 'scheduled', sourceLabel: 'Local timetable assets' },
  { id: 'buses', section: 'buses', label: 'Buses', dataClass: 'live', sourceLabel: 'DATA.GOV.HK / operator feeds' },
  { id: 'ferries', section: 'ferries', label: 'Ferries', dataClass: 'scheduled', sourceLabel: 'GTFS schedule assets' },
  { id: 'trams', section: 'trams', label: 'Trams', dataClass: 'scheduled', sourceLabel: 'GTFS schedule assets' },
  { id: 'flights', section: 'flights', label: 'Flights', dataClass: 'replay', sourceLabel: 'AAHK historical records', sourceUrl: 'https://data.gov.hk/en-data/dataset/aahk-team1-flight-info' },
  { id: 'hkia-aip', section: 'dataStatus', label: 'HKIA runway geometry', dataClass: 'static', sourceLabel: 'Hong Kong AIP', sourceUrl: HKG_AIP_SOURCE },
  { id: 'hkia-ground', section: 'dataStatus', label: 'HKIA ground context', dataClass: 'static', sourceLabel: 'OpenStreetMap snapshot', sourceUrl: HKIA_OSM_SOURCE },
]
