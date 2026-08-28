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

export interface BusRoute extends LocalizedName {
  id: string
  operator: string
  routeNumber: string
  color: string
  stopIds: string[]
  geometry: Coordinate[]
}

export interface BusSchedule {
  id: string
  routeId: string
  scheduleType: ScheduleType
  startMinutes: number
  endMinutes: number
  headwayMinutes: number
  durationMinutes: number
  dwellMinutes: number
}

export interface FerryRoute extends LocalizedName {
  id: string
  operator: string
  routeNumber: string
  color: string
  stopIds: string[]
  geometry: Coordinate[]
  journeyTimeMinutes: number
}

export type TramRoute = FerryRoute

export interface FerrySchedule {
  id: string
  routeId: string
  scheduleType: ScheduleType
  startMinutes: number
  endMinutes: number
  headwayMinutes: number
  durationMinutes: number
  dwellMinutes: number
}

export type TramSchedule = FerrySchedule

export interface BusArrival {
  id: string
  routeId: string
  stopSequence: number
  arrivalSequence: number
  destinationEn: string
  destinationZh: string
  eta: string
  remarkEn: string
  dataTimestamp: string
}

export type FlightDirection = 'arrival' | 'departure'
export type FlightSourceLanguage = 'en' | 'zh_HK' | 'zh_CN'

export interface FlightLocalizedFields {
  origin: Partial<Record<FlightSourceLanguage, string>>
  destination: Partial<Record<FlightSourceLanguage, string>>
  status: Partial<Record<FlightSourceLanguage, string>>
}

export interface AirportFlight {
  id: string
  date: string
  direction: FlightDirection
  cargo: boolean
  sequence: number
  flightNumbers: string[]
  airlineCode: string | null
  origin: string | null
  destination: string | null
  scheduledTime: string
  statusCode: string | null
  status: string | null
  sourceLanguage: FlightSourceLanguage
  localized: FlightLocalizedFields
}

export interface AirportFacility extends LocalizedName {
  id: string
  iataCode: string
  icaoCode: string
  coordinates: Coordinate
  sourceUrl: string
}

export interface TransitData {
  railLines: RailLine[]
  stations: Station[]
  trips: Trip[]
  busRoutes?: BusRoute[]
  busArrivals?: BusArrival[]
  busDataTimestamp?: string
  ferryRoutes?: FerryRoute[]
  ferrySchedules?: FerrySchedule[]
  tramRoutes?: TramRoute[]
  tramSchedules?: TramSchedule[]
  flights?: AirportFlight[]
  airportFacilities?: AirportFacility[]
}

export interface VehiclePosition {
  id: string
  type: TransitMode | 'bus' | 'ferry' | 'tram' | 'flight'
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
