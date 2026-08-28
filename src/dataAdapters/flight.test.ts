import { describe, expect, it } from 'vitest'
import { normalizeHkgFlightResponse } from './flight'

describe('normalizeHkgFlightResponse', () => {
  it('normalizes a multilingual passenger departure record', () => {
    const flights = normalizeHkgFlightResponse({
      Date: '2026-08-27',
      Arrival: false,
      Cargo: false,
      List: [{
        Sequence: 12,
        Destination: 'Taipei',
        Time: '09:30',
        FlightNumberList: [{ No: 'HX246', Airline: 'HX' }],
        StatusCode: 'DEP',
        Status: 'Departed',
      }],
    }, 'en')

    expect(flights).toEqual([{
      id: '2026-08-27-departure-passenger-12',
      date: '2026-08-27',
      direction: 'departure',
      cargo: false,
      sequence: 12,
      flightNumbers: ['HX246'],
      airlineCode: 'HX',
      origin: null,
      destination: 'Taipei',
      scheduledTime: '09:30',
      statusCode: 'DEP',
      status: 'Departed',
      sourceLanguage: 'en',
    }])
  })

  it('filters incomplete records and supports arrival and cargo variants', () => {
    const flights = normalizeHkgFlightResponse({
      Date: '2026-08-27',
      Arrival: true,
      Cargo: true,
      List: [
        { Sequence: 1, Origin: 'Tokyo', Time: '03:10', FlightNumberList: [{ No: 'CX999' }] },
        { Sequence: 2, Origin: '', Time: '', FlightNumberList: [] },
      ],
    }, 'zh_HK')

    expect(flights).toHaveLength(1)
    expect(flights[0]).toMatchObject({
      id: '2026-08-27-arrival-cargo-1',
      direction: 'arrival',
      cargo: true,
      origin: 'Tokyo',
      destination: null,
      sourceLanguage: 'zh_HK',
    })
  })
})
