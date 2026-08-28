import { describe, expect, it } from 'vitest'
import { normalizeFerryGtfsSchedules } from './ferrySchedule'

describe('normalizeFerryGtfsSchedules', () => {
  it('converts ferry GTFS trips into explicit weekday and weekend departures', () => {
    const result = normalizeFerryGtfsSchedules({
      routes: [
        '\uFEFFroute_id,agency_id,route_short_name,route_long_name,route_type',
        '7005,FERRY,,CENTRAL - CHEUNG CHAU,4',
        '1001,KMB,1,NOT A FERRY,3',
      ].join('\n'),
      trips: [
        'route_id,service_id,trip_id',
        '7005,weekday,7005-1-weekday-0800',
      ].join('\n'),
      calendar: [
        'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
        'weekday,1,1,1,1,1,0,0,20200101,20991231',
      ].join('\n'),
      stopTimes: [
        'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
        '7005-1-weekday-0800,08:00:00,08:00:00,101,1',
        '7005-1-weekday-0800,08:20:00,08:20:00,102,2',
      ].join('\n'),
    })

    expect(result).toEqual([{
      id: '7005-1-weekday-0800-weekday',
      routeId: 'ferry-7005-1',
      scheduleType: 'weekday',
      startMinutes: 480,
      endMinutes: 480,
      headwayMinutes: 1,
      durationMinutes: 20,
      dwellMinutes: 0,
    }])
  })

  it('supports trips crossing midnight and skips malformed or non-ferry trips', () => {
    expect(normalizeFerryGtfsSchedules({
      routes: [
        'route_id,agency_id,route_short_name,route_long_name,route_type',
        '7006,FERRY,,CENTRAL - MUI WO,4',
        '1001,KMB,1,NOT A FERRY,3',
      ].join('\n'),
      trips: [
        'route_id,service_id,trip_id',
        '7006,weekend,7006-2-weekend-2330',
        '1001,weekend,1001-1-weekend-1200',
        '7006,weekend,bad-trip',
      ].join('\n'),
      calendar: [
        'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
        'weekend,0,0,0,0,0,1,1,20200101,20991231',
      ].join('\n'),
      stopTimes: [
        'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
        '7006-2-weekend-2330,23:30:00,23:30:00,201,1',
        '7006-2-weekend-2330,24:10:00,24:10:00,202,2',
      ].join('\n'),
    })).toEqual([{
      id: '7006-2-weekend-2330-weekend',
      routeId: 'ferry-7006-2',
      scheduleType: 'weekend',
      startMinutes: 1410,
      endMinutes: 1410,
      headwayMinutes: 1,
      durationMinutes: 40,
      dwellMinutes: 0,
    }])
  })
})
