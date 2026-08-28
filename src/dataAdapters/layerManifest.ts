import { HKG_AIP_SOURCE } from './airport'
import { HKIA_OSM_SOURCE } from './airportGround'

export type LayerDataClass = 'static' | 'scheduled' | 'live' | 'replay'

export interface LayerManifestEntry {
  id: string
  section: 'rail' | 'lightRail' | 'buses' | 'ferries' | 'trams' | 'flights' | 'dataStatus'
  labelEn: string
  labelZh: string
  labelPt: string
  dataClass: LayerDataClass
  sourceLabelEn: string
  sourceLabelZh: string
  sourceLabelPt: string
  sourceUrl?: string
}

// One compact registry keeps the directory's visible domains auditable.
export const layerManifest: LayerManifestEntry[] = [
  { id: 'mtr', section: 'rail', labelEn: 'MTR', labelZh: '港鐵', labelPt: 'MTR', dataClass: 'scheduled', sourceLabelEn: 'Local timetable assets', sourceLabelZh: '本地時間表資產', sourceLabelPt: 'Ativos locais de horarios' },
  { id: 'light-rail', section: 'lightRail', labelEn: 'Light Rail', labelZh: '輕鐵', labelPt: 'Metro Ligeiro', dataClass: 'scheduled', sourceLabelEn: 'Local timetable assets', sourceLabelZh: '本地時間表資產', sourceLabelPt: 'Ativos locais de horarios' },
  { id: 'buses', section: 'buses', labelEn: 'Buses', labelZh: '巴士', labelPt: 'Autocarros', dataClass: 'live', sourceLabelEn: 'DATA.GOV.HK / operator feeds', sourceLabelZh: 'DATA.GOV.HK／營辦商資料流', sourceLabelPt: 'DATA.GOV.HK / feeds dos operadores' },
  { id: 'ferries', section: 'ferries', labelEn: 'Ferries', labelZh: '渡輪', labelPt: 'Ferries', dataClass: 'scheduled', sourceLabelEn: 'GTFS schedule assets', sourceLabelZh: 'GTFS 時間表資產', sourceLabelPt: 'Ativos de horarios GTFS' },
  { id: 'trams', section: 'trams', labelEn: 'Trams', labelZh: '電車', labelPt: 'Eletricos', dataClass: 'scheduled', sourceLabelEn: 'GTFS schedule assets', sourceLabelZh: 'GTFS 時間表資產', sourceLabelPt: 'Ativos de horarios GTFS' },
  { id: 'flights', section: 'flights', labelEn: 'Flights', labelZh: '航班', labelPt: 'Voos', dataClass: 'replay', sourceLabelEn: 'AAHK historical records', sourceLabelZh: '香港機場管理局歷史記錄', sourceLabelPt: 'Registos historicos da AAHK', sourceUrl: 'https://data.gov.hk/en-data/dataset/aahk-team1-flight-info' },
  { id: 'hkia-aip', section: 'dataStatus', labelEn: 'HKIA runway geometry', labelZh: '香港國際機場跑道幾何', labelPt: 'Geometria das pistas do HKIA', dataClass: 'static', sourceLabelEn: 'Hong Kong AIP', sourceLabelZh: '香港航空情報刊物', sourceLabelPt: 'AIP de Hong Kong', sourceUrl: HKG_AIP_SOURCE },
  { id: 'hkia-ground', section: 'dataStatus', labelEn: 'HKIA ground context', labelZh: '香港國際機場地面環境', labelPt: 'Contexto terrestre do HKIA', dataClass: 'static', sourceLabelEn: 'OpenStreetMap snapshot', sourceLabelZh: 'OpenStreetMap 快照', sourceLabelPt: 'Snapshot do OpenStreetMap', sourceUrl: HKIA_OSM_SOURCE },
]
