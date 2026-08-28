import type { AirportFlight, FlightLocalizedFields, FlightSourceLanguage } from '../types'

export interface HkgFlightNumber {
  No?: unknown
  Airline?: unknown
}

export interface HkgFlightApiRecord {
  Sequence?: unknown
  Origin?: unknown
  Destination?: unknown
  Time?: unknown
  FlightNumberList?: unknown
  'Flight number list'?: unknown
  Airline?: unknown
  StatusCode?: unknown
  Status?: unknown
}

export interface HkgFlightApiResponse {
  Date?: unknown
  Arrival?: unknown
  Cargo?: unknown
  List?: unknown
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function positiveInteger(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function flightNumbers(value: unknown): Array<{ number: string; airline: string | null }> {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const entry = item as HkgFlightNumber
    const number = nonEmptyString(entry.No)
    if (!number) return []
    return [{ number, airline: nonEmptyString(entry.Airline) }]
  })
}

export function normalizeHkgFlightResponse(
  response: HkgFlightApiResponse,
  sourceLanguage: FlightSourceLanguage,
): AirportFlight[] {
  const date = nonEmptyString(response.Date)
  const arrival = typeof response.Arrival === 'boolean' ? response.Arrival : null
  const cargo = typeof response.Cargo === 'boolean' ? response.Cargo : null
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || arrival === null || cargo === null) return []

  const records = Array.isArray(response.List) ? response.List : []
  const direction = arrival ? 'arrival' : 'departure'
  const kind = cargo ? 'cargo' : 'passenger'

  return records.flatMap(recordValue => {
    if (!recordValue || typeof recordValue !== 'object') return []
    const record = recordValue as HkgFlightApiRecord
    const sequence = positiveInteger(record.Sequence)
    const scheduledTime = nonEmptyString(record.Time)
    const numbers = flightNumbers(record.FlightNumberList ?? record['Flight number list'])
    if (sequence === null || !scheduledTime || numbers.length === 0) return []

    const numberValues = [...new Set(numbers.map(item => item.number))]
    return [{
      id: `${date}-${direction}-${kind}-${sequence}`,
      date,
      direction,
      cargo,
      sequence,
      flightNumbers: numberValues,
      airlineCode: numbers.find(item => item.airline)?.airline ?? nonEmptyString(record.Airline),
      origin: arrival ? nonEmptyString(record.Origin) : null,
      destination: arrival ? null : nonEmptyString(record.Destination),
      scheduledTime,
      statusCode: nonEmptyString(record.StatusCode),
      status: nonEmptyString(record.Status),
      sourceLanguage,
      localized: {
        origin: arrival && nonEmptyString(record.Origin) ? { [sourceLanguage]: nonEmptyString(record.Origin) } : {},
        destination: !arrival && nonEmptyString(record.Destination) ? { [sourceLanguage]: nonEmptyString(record.Destination) } : {},
        status: nonEmptyString(record.Status) ? { [sourceLanguage]: nonEmptyString(record.Status) } : {},
      },
    } satisfies AirportFlight]
  })
}

function firstLocalizedValue(values: FlightLocalizedFields['origin']): string | null {
  return values.en ?? values.zh_HK ?? values.zh_CN ?? null
}

export function mergeHkgFlightLocales(feeds: AirportFlight[][]): AirportFlight[] {
  const merged = new Map<string, AirportFlight>()
  for (const feed of feeds) {
    for (const flight of feed) {
      const previous = merged.get(flight.id)
      if (!previous) {
        merged.set(flight.id, flight)
        continue
      }
      const localized: FlightLocalizedFields = {
        origin: { ...previous.localized.origin, ...flight.localized.origin },
        destination: { ...previous.localized.destination, ...flight.localized.destination },
        status: { ...previous.localized.status, ...flight.localized.status },
      }
      merged.set(flight.id, {
        ...previous,
        airlineCode: previous.airlineCode ?? flight.airlineCode,
        origin: firstLocalizedValue(localized.origin),
        destination: firstLocalizedValue(localized.destination),
        status: firstLocalizedValue(localized.status),
        localized,
        sourceLanguage: localized.origin.en || localized.destination.en || localized.status.en ? 'en' : previous.sourceLanguage,
      })
    }
  }
  return [...merged.values()]
}
