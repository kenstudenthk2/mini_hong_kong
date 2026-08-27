export type Coordinate = [number, number]
export type Lang = 'en' | 'zh' | 'pt'
export type TransitMode = 'mtr' | 'light_rail'
export type FutureTransitMode = TransitMode | 'bus' | 'ferry' | 'tram' | 'flight'
export type ScheduleType = 'weekday' | 'weekend'

export interface LocalizedName {
  nameEn: string
  nameZh: string
  namePt?: string
}

export interface RailLine extends LocalizedName {
  id: string
  mode: TransitMode
  color: string
  operator: string
  stationIds: string[]
  geometry: Coordinate[]
}

export interface Station extends LocalizedName {
  id: string
  coordinates: Coordinate
  lineIds: string[]
}

export interface Trip {
  id: string
  lineId: string
  direction: 'outbound' | 'inbound'
  scheduleType: ScheduleType
  startMinutes: number
  endMinutes: number
  headwayMinutes: number
  durationMinutes: number
  dwellMinutes: number
  stopIds: string[]
}

export interface TransitData {
  railLines: RailLine[]
  stations: Station[]
  trips: Trip[]
  busRoutes?: unknown[]
  ferryRoutes?: unknown[]
  tramRoutes?: unknown[]
  flights?: unknown[]
}

export interface VehiclePosition {
  id: string
  type: TransitMode
  lineId: string
  tripId: string
  color: string
  coordinates: Coordinate
  bearing: number
  progress: number
  labelEn: string
  labelZh: string
  labelPt: string
  nextStopId: string | null
  destinationId: string | null
}

export interface SimulationClock {
  currentTime: Date
  speed: number
  paused: boolean
  setSpeed: (speed: number) => void
  setPaused: (paused: boolean) => void
  syncToNow: () => void
  setTime: (time: Date) => void
}
