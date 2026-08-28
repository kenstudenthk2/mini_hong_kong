import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Lang, LocalizedName } from '../types'

const translations = {
  en: {
    appName: 'Mini Hong Kong',
    subtitle: 'Schedule-driven 3D transit simulation',
    rail: 'Rail',
    lightRail: 'Light Rail',
    buses: 'Buses',
    ferries: 'Ferries',
    trams: 'Trams',
    flights: 'Flights',
    dataStatus: 'Data Status',
    settings: 'Settings',
    planned: 'Planned',
    active: 'Active',
    source: 'Source',
    dataGov: 'DATA.GOV.HK',
    simulation: 'Simulation',
    vehicles: 'vehicles',
    play: 'Play',
    pause: 'Pause',
    now: 'Now',
    speed: 'Speed',
    language: 'Language',
    mapMode: 'Map',
    mode3d: '3D',
    mode2d: '2D',
    selectedVehicle: 'Selected vehicle',
    noSelection: 'Select a vehicle or station',
    nextStop: 'Next stop',
    destination: 'Destination',
    flightRecords: 'flight records',
    historical: 'Historical',
    noFlightData: 'No records loaded',
    arrival: 'Arrival',
    departure: 'Departure',
    cargo: 'Cargo',
  },
  zh: {
    flightRecords: '\u822a\u73ed\u8a18\u9304',
    historical: '\u6b77\u53f2\u6578\u64da',
    noFlightData: '\u6c92\u6709\u8f09\u5165\u8a18\u9304',
    arrival: '\u5230\u9054',
    departure: '\u96e2\u6e2f',
    cargo: '\u8ca8\u904b',
    appName: 'Mini Hong Kong',
    subtitle: '按時間表推進的 3D 交通模擬',
    rail: '鐵路',
    lightRail: '輕鐵',
    buses: '巴士',
    ferries: '渡輪',
    trams: '電車',
    flights: '航班',
    dataStatus: '數據狀態',
    settings: '設定',
    planned: '計劃中',
    active: '啟用',
    source: '來源',
    dataGov: '資料一線通',
    simulation: '模擬',
    vehicles: '班車',
    play: '播放',
    pause: '暫停',
    now: '現在',
    speed: '速度',
    language: '語言',
    mapMode: '地圖',
    mode3d: '3D',
    mode2d: '2D',
    selectedVehicle: '已選班車',
    noSelection: '選擇班車或車站',
    nextStop: '下一站',
    destination: '目的地',
  },
  pt: {
    appName: 'Mini Hong Kong',
    subtitle: 'Simulacao 3D de transporte por horario',
    rail: 'Metro',
    lightRail: 'Metro Ligeiro',
    buses: 'Autocarros',
    ferries: 'Ferries',
    trams: 'Eletricos',
    flights: 'Voos',
    dataStatus: 'Estado dos dados',
    settings: 'Definicoes',
    planned: 'Planeado',
    active: 'Ativo',
    source: 'Fonte',
    dataGov: 'DATA.GOV.HK',
    simulation: 'Simulacao',
    vehicles: 'veiculos',
    play: 'Reproduzir',
    pause: 'Pausar',
    now: 'Agora',
    speed: 'Velocidade',
    language: 'Idioma',
    mapMode: 'Mapa',
    mode3d: '3D',
    mode2d: '2D',
    selectedVehicle: 'Veiculo selecionado',
    noSelection: 'Selecione um veiculo ou estacao',
    nextStop: 'Proxima paragem',
    destination: 'Destino',
    flightRecords: 'registos de voos',
    historical: 'Historico',
    noFlightData: 'Sem registos carregados',
    arrival: 'Chegada',
    departure: 'Partida',
    cargo: 'Carga',
  },
} satisfies Record<Lang, Record<string, string>>

type Messages = Record<keyof typeof translations.en, string>

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const value = useMemo(() => ({ lang, setLang, t: translations[lang] }), [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

export function localName(item: LocalizedName | undefined, lang: Lang): string {
  if (!item) return ''
  if (lang === 'zh') return item.nameZh || item.nameEn
  if (lang === 'pt') return item.namePt || item.nameEn
  return item.nameEn
}
