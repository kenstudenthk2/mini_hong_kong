# Task 004: Follow-Up Data Adapters

## Owner
Data Engineer + GIS QA

## Context Files
- `docs/data-sources/hong-kong-open-data.md`
- `src/dataSchemas.ts`
- `public/data/`

## Acceptance Criteria
- Each new source has URL, cadence, staleness behavior, schema validation, and output file.
- No scraper or ETL script is added until a concrete output is approved.
- OSM geometry work uses Overpass/extract-style read paths, not the core OSM editing API, unless a separate approved task explicitly needs editing.
- Buses, ferries, trams, and flights are implemented as separate PRs.

## Status
KMB adapter slice complete; generated output, browser wiring, and other bus operators remain separate tasks.

## Bus contract slice
- Source family: DATA.GOV.HK transport datasets, with operator ETA feeds as the future realtime overlay.
- Normalization cadence: define during adapter task; this slice contains no downloader or generated bus output.
- Staleness behavior: future UI must label the route feed stale when its source timestamp exceeds the configured freshness window.
- Schema: `BusRoutesSchema` in `src/dataSchemas.ts` validates route identity, operator, localized names, color, ordered stops, and geometry.
- Output file: none yet; a generated `public/data/bus-routes.json` requires a separate approved adapter/output task.
- Validation: `npm.cmd test -- src/dataAdapters/kmb.test.ts src/dataSchemas.test.ts`

## KMB adapter slice
- Dataset: [Real time Arrival Data of Kowloon Motor Bus and Long Win Bus Services](https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb).
- Route API: `https://data.etabus.gov.hk/v1/transport/kmb/route/`.
- Route-stop API: `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/`.
- Stop API: `https://data.etabus.gov.hk/v1/transport/kmb/stop/`.
- Cadence: route and stop data are updated daily; the dataset page states ETA data updates every minute.
- Normalizer: `src/dataAdapters/kmb.ts` converts a validated snapshot into route-direction records and uses stop `long`/`lat` for geometry.
- Staleness: the snapshot timestamp is retained as adapter input; UI stale labeling and generated output are pending the next approved task.

## Compact handoff: KMB ETA parser
- Complete: `normalizeKmbEta` validates and normalizes live ETA records, including route ID, stop sequence, destination, ETA, remark, and source timestamp.
- Source behavior: ETA data is published per stop/route and the DATA.GOV.HK dataset states a one-minute update cadence.
- Evidence: parser tests cover a valid record and invalid envelope timestamp; ETA-to-vehicle placement remains the next task.
- Contract detail: `eta_seq` is retained as `arrivalSequence` so concurrent predicted buses remain distinct during interpolation.

## Compact handoff: ETA vehicle placement
- Complete: `computeBusVehiclePositionsFromEta` places buses between consecutive KMB stop predictions using the shared simulation clock.
- Guardrails: incomplete stop pairs, missing routes, invalid time order, and pre-first-stop predictions produce no invented vehicle position.
- Evidence: full test, lint, and build gates pass; runtime ETA fetch/wiring remains the next task.

## Compact handoff: KMB ETA runtime wiring
- Complete: the app requests the route-level ETA feed for KMB route 1 and prefers ETA-based vehicle placement when valid arrivals are available.
- Scope: route-level ETA is currently limited to route 1 to control request volume; other KMB routes and operators remain separate increments.
- Fallback: an explicit replay schedule is used only when the ETA request fails or returns no records.
- Evidence: full test, lint, and build gates passed; live browser rendering still needs a connected-data visual check.

## Compact handoff: bus geometry utility
- Complete: `busRoutesToGeoJson` converts normalized KMB routes to MapLibre `LineString` features with route metadata.
- Evidence: `src/layers/vehicleShapes.test.ts` passes; map wiring and bus vehicle simulation remain separate tasks.
- Clear context: no live payload or generated route file is stored in this task.

## Compact handoff: bus map wiring
- Complete: KMB routes are passed into `MapView` and rendered through a dedicated dashed MapLibre layer and schematic fallback.
- Evidence: full test, lint, and build gates pass after this task; bus vehicle simulation and route filtering remain separate.
- Clear context: KMB route loading remains optional and does not block the rail experience.

## Compact handoff: bus replay vehicle scaffold
- Complete: KMB route 1 has an explicitly labelled weekday replay schedule and its vehicles share the simulation clock.
- Approximation: KMB route APIs expose topology and realtime ETA, not headway/timetable fields; the replay schedule is not an operator timetable.
- Evidence: full test and build gates passed in the implementation task; official timetable/ETA-driven movement remains follow-up work.

## Compact handoff: source freshness contract
- Complete: `classifyFreshness` returns `fresh`, `stale`, or `invalid` for a source timestamp and configured age window.
- Scope: pure helper only; KMB timestamp propagation and menu labeling are the next separate wiring task.
- Evidence: `src/dataAdapters/freshness.test.ts` covers fresh, stale, and malformed timestamps; focused test and lint pass.
- Clear context: no network fetch behavior or generated data output changed in this slice.

## Compact handoff: KMB freshness status wiring
- Complete: the KMB ETA envelope timestamp is retained as `TransitData.busDataTimestamp` and shown in the Data Status menu.
- Policy: the one-minute ETA cadence is used as the freshness window; failed or empty ETA loads retain the existing replay fallback and show `invalid`.
- Evidence: full suite has 27 passing tests; lint, build, and `git diff --check` pass. Commit: `121a2f3`.
- Next task: expand ETA coverage beyond route 1 or add another operator as a separate adapter slice; connected visual QA remains blocked by unavailable browser tooling.

## Compact handoff: Citybus route adapter
- Complete: `normalizeCitybusRoutes` validates Citybus route, route-stop, and stop records and emits one normalized `BusRoute` per inbound/outbound direction.
- Source contract: Citybus provides multilingual route/stop data through DATA.GOV.HK-backed APIs; ETA data is documented as updating every minute.
- Guardrails: missing coordinates or fewer than two ordered stops omit only the affected direction; no network fetch or generated output was added.
- Evidence: `src/dataAdapters/citybus.test.ts` covers localized names, coordinate ordering, direction IDs, and incomplete geometry; full suite has 29 passing tests and build passes. Commit: `487bb39`.
- Next task: add bounded Citybus route/stop loading and ETA integration with explicit request-volume and freshness behavior.

## Compact handoff: bounded Citybus runtime loading
- Complete: the app loads Citybus v2 route metadata, both directions for eight explicitly configured routes, and deduplicated stop coordinates, then merges them with KMB routes.
- Request policy: route-stop requests are capped at four concurrent calls and stop lookups at eight concurrent calls; Citybus remains optional and cannot block rail/KMB fallback data.
- Evidence: live read-only smoke check found 407 published routes, selected all eight configured routes, 16 route-stop requests, and 366 unique stops; full suite has 30 passing tests and build passes. Commit: `307378f`.
- Known risk: the current eight-route geometry load can add startup latency and may encounter provider rate limits; Citybus ETA and asynchronous post-load hydration are separate follow-up tasks.

## Compact handoff: Citybus route-1 ETA simulation
- Complete: Citybus ETA records are normalized into the shared `BusArrival` contract and route-1 inbound/outbound predictions are loaded into the existing bus movement engine.
- Request policy: only route 1 ETA stop requests are made, with eight concurrent requests; empty ETA values are filtered and failed Citybus requests remain optional.
- Evidence: official route-1 ETA sample returned HTTP 200 with six records; full suite has 31 passing tests, lint/build/diff checks pass. Commit: `6e7517e`.
- Known risk: Citybus feed timestamp is not yet surfaced independently from the KMB freshness field; route coverage and asynchronous hydration remain follow-up tasks.

## Compact handoff: ferry GeoJSON adapter
- Complete: `normalizeFerryGeoJson` validates Transport Department ferry GeoJSON, filters ferry route types, groups ordered pier points by route/direction, and preserves English/Traditional Chinese names and journey time.
- Source contract: `https://static.data.gov.hk/td/routes-fares-geojson/JSON_FERRY.json`; DATA.GOV.HK lists this route/fare source as multilingual GeoJSON with biweekly updates.
- Guardrails: non-ferry features and route groups with fewer than two piers are omitted; no network loader, generated file, or schedule replay was added.
- Evidence: `src/dataAdapters/ferry.test.ts` covers route grouping, coordinate ordering, localization, and filtering; full suite has 33 passing tests, lint/build/diff checks pass. Commit: `a08b238`.
- Next task: load the ferry GeoJSON into the map and add a bounded timetable-driven ferry movement model.

## Compact handoff: ferry route rendering
- Complete: the official ferry GeoJSON is loaded as optional transit data and rendered through a dedicated MapLibre `ferry-routes` line layer plus schematic fallback paths.
- Scope: route geometry only; no ferry vehicle positions or timetable replay are generated yet.
- Evidence: full suite has 33 passing tests, lint/build/diff checks pass. Commit: `d41c03d`.
- Known risk: the live ferry payload is a large network response and currently waits in the initial data load; ferry schedule integration should address asynchronous hydration and stale-source labeling.

## Compact handoff: scheduled ferry movement engine
- Complete: `computeFerryVehiclePositions` creates headway-based ferry vehicles using shared Hong Kong operational-day rules and route interpolation, including dwell, bearing, destination, and `ferry` vehicle type.
- Contract: `FerrySchedule` carries explicit service window, headway, duration, and dwell values; route `journeyTimeMinutes` can seed an approved schedule but is not itself treated as a timetable.
- Evidence: full suite has 34 passing tests, lint/build/diff checks pass. Commit: `b1ec6d9`.
- Next task: provide an approved ferry timetable source/output and wire schedules into `App`; do not invent service frequencies from route geometry alone.

## Compact handoff: ferry GTFS schedule adapter
- Complete: `normalizeFerryGtfsSchedules` parses quoted CSV fields, strips a UTF-8 BOM, filters GTFS ferry routes (`route_type=4`), maps service calendars to weekday/weekend, and emits one explicit departure per trip.
- Source contract: `https://static.data.gov.hk/td/pt-headway-en/routes.txt`, `trips.txt`, `stop_times.txt`, and `calendar.txt`; the live route list check found 59 ferry routes and the trip check found 2,494 ferry trips.
- Semantics: `headwayMinutes=1` with equal start/end minutes represents a single scheduled departure; duration comes from first departure to last arrival, including GTFS times beyond 24:00.
- Evidence: `src/dataAdapters/ferrySchedule.test.ts` covers weekday service, weekend service, non-ferry filtering, malformed trips, BOM handling, and post-midnight duration; full suite has 36 passing tests. Commit: `2a7daf9`.
- Next task: add explicit-departure handling for post-midnight trips in the engine, then wire approved schedules into `App`; no generated timetable file was added.

## Compact handoff: overnight explicit ferry departures
- Complete: shared `activeStarts` and caller clock adjustment now support single-departure schedules whose travel continues past midnight; repeating rail and bus schedules retain their prior behavior.
- Regression: a 23:30 ferry departure with a 40-minute duration remains active and progresses at 00:10 on the next operational day.
- Evidence: full suite has 37 passing tests, lint/build/diff checks pass. Commit: `ee146a8`.
- Next task: load the approved ferry GTFS schedules into `App`, selecting a bounded route set or staged hydration strategy to avoid blocking initial map rendering.

## Compact handoff: staged ferry schedule wiring
- Complete: ferry GTFS files are loaded after the initial transit state resolves; normalized schedules are added to `TransitData` and passed to `computeFerryVehiclePositions` in `App`.
- Performance policy: schedule loading is optional and staged, so route geometry and the initial rail/bus experience do not wait for the large GTFS files.
- Evidence: full suite has 37 passing tests, lint/build/diff checks pass. Commit: `c21d1d4`.
- Known limitation: `MapView` currently treats only buses and selected rail lines as visible vehicles; a follow-up must include ferry vehicles in the visibility filter and menu counts.

## Compact handoff: ferry vehicle visibility
- Complete: `MapView` now includes `ferry` vehicles in the always-visible vehicle filter, covering both MapLibre points/extrusions and schematic hotspots.
- Scope: visibility only; ferry menu counts and labels remain a separate UI task.
- Evidence: full suite has 37 passing tests, lint/build/diff checks pass. Commit: `95ed296`.

## Compact handoff: ferry directory menu
- Complete: Ferries now appear as an active directory section with route-geometry and live vehicle counts; the Data Status summary includes ferries alongside rail and buses.
- Scope: menu discoverability only; tram and flight sections remain planned.
- Evidence: full suite has 37 passing tests, lint/build/diff checks pass. Commit: `f46993e`.

## Compact handoff: tram GeoJSON adapter
- Complete: `normalizeTramGeoJson` validates the official Transport Department tram GeoJSON, filters `routeType: 4`, groups ordered stop points by route/direction, and preserves localized names and journey time.
- Source contract: `https://static.data.gov.hk/td/routes-fares-geojson/JSON_TRAM.json`; live inspection returned 427 tram features.
- Guardrails: non-tram features and incomplete route groups are omitted; no runtime fetch or generated output was added in this slice.
- Evidence: `src/dataAdapters/tram.test.ts` covers direction grouping, coordinate ordering, localization, and filtering; full suite has 39 passing tests, lint/build/diff checks pass. Commit: `9be47e2`.
- Next task: load tram geometry into the map, add tram schedule/vehicle movement, and promote Trams in the directory menu.

## Compact handoff: tram route rendering
- Complete: official tram GeoJSON is loaded as optional transit data and rendered through a dedicated `tram-routes` MapLibre line layer plus dashed schematic paths.
- Scope: route geometry only; tram vehicles and schedule data are not generated yet.
- Evidence: full suite has 39 passing tests, lint/build/diff checks pass. Commit: `92abd1c`.
- Known risk: tram route loading is part of the initial optional feed batch and may contribute network latency; schedule and menu integration remain separate tasks.

## Compact handoff: tram GTFS schedule adapter
- Complete: the shared GTFS schedule parser now exposes `normalizeTramGtfsSchedules`, filtering official tram routes with `route_type=0` and producing `tram-*` route IDs while retaining weekday/weekend service calendars.
- Source contract: `https://static.data.gov.hk/td/pt-headway-en/routes.txt`, `trips.txt`, `stop_times.txt`, and `calendar.txt`; the live route check found six tram routes.
- Scope: adapter/type contract only; tram schedules are not yet loaded into `TransitData` or passed to a tram vehicle engine.
- Evidence: new tram schedule fixture passes; full suite has 40 passing tests, lint/build/diff checks pass. Commit: `f1894d7`.
- Next task: add `computeTramVehiclePositions`, wire staged tram schedules into `App`, and include tram vehicles in `MapView` visibility.

## Compact handoff: scheduled tram movement
- Complete: `computeTramVehiclePositions` creates `tram` vehicles from normalized schedule departures, reusing shared interpolation, dwell, destination, and overnight activation behavior.
- Contract: `VehiclePosition.type` now includes `tram`; no timetable fetch or app wiring was changed in this slice.
- Evidence: full suite has 41 passing tests, lint/build/diff checks pass. Commit: `3eb6729`.
- Next task: stage tram GTFS schedule loading into `TransitData`, feed schedules into `App`, and include tram vehicles in the map/menu visibility state.

## Compact handoff: staged tram schedule wiring
- Complete: one staged GTFS download now derives both ferry and tram schedules; tram schedules hydrate into `TransitData` and feed `computeTramVehiclePositions` in `App`.
- Performance policy: ferry and tram schedule files are fetched once after the initial transit state resolves; failures remain optional and do not invalidate rail/bus data.
- Evidence: full suite has 41 passing tests, lint/build/diff checks pass. Commit: `d057b7c`.
- Known limitation: `MapView` and the directory menu still need explicit tram vehicle visibility/count treatment; tram source geometry is already rendered.

## Compact handoff: tram visibility and directory activation
- Complete: tram vehicles are always visible in MapLibre/schematic views, and Trams are promoted from Planned to an active directory section with route and vehicle counts.
- Scope: visibility and menu state only; flight mode remains planned.
- Evidence: full suite has 41 passing tests, lint/build/diff checks pass. Commit: `5225867`.

## Compact handoff: HKG flight response adapter
- Complete: `normalizeHkgFlightResponse` validates and normalizes Airport Authority Hong Kong's documented historical JSON response into typed arrival/departure flight records, including cargo flag, flight numbers, airline code, time, status, and source language.
- Source contract: DATA.GOV.HK dataset `aahk-team1-flight-info`, backed by `https://www.hongkongairport.com/flightinfo-rest/rest/flights/past`; the official specification documents `en`, `zh_HK`, and `zh_CN` responses updated through the previous calendar day.
- Guardrails: incomplete records and invalid dates/sequences are omitted; no live-flight claim, fabricated airport geometry, or generated schedule was added.
- Evidence: `src/dataAdapters/flight.test.ts` covers passenger departure normalization plus arrival/cargo filtering; full suite has 43 passing tests, lint/build/diff checks pass. Commit: `d900bd9`.
- Next task: add an optional staged runtime loader for the three language feeds, then render airport/flight state without blocking the existing transit map.

## Compact handoff: staged HKG flight feeds
- Complete: the app asynchronously loads Airport Authority historical passenger/cargo arrivals and departures in `en`, `zh_HK`, and `zh_CN`, then merges records by date/direction/cargo/sequence identity into `TransitData.flights`.
- Request policy: exactly 12 feed queries are generated per hydration (3 languages x 2 directions x 2 cargo states), with at most four concurrent requests; each failed request degrades to an empty feed and never blocks the base transit map.
- Semantics: the query date is the previous Hong Kong calendar day because the official endpoint is historical; this is not represented as live aircraft telemetry.
- Evidence: loader test covers request matrix, bounded result count, and localized merge; full focused gates pass. Commit: `5b030b5`.
- Next task: render an airport/flight directory and information surface, then decide whether a documented airport geometry source is available before adding aircraft motion.

## Compact handoff: flight directory activation
- Complete: Flights are now an active directory section with localized English, Traditional Chinese, and Portuguese labels, loaded-record count, historical source date, and DATA.GOV.HK attribution.
- Semantics: the section remains feed-backed status only; it does not imply live aircraft positions or schedule-driven flight motion.
- Evidence: full suite has 45 passing tests, lint/build/diff checks pass. Commit: `ec428cb`.
- Next task: add a focused flight information surface and investigate an authoritative airport/route geometry source before introducing aircraft visualization.

## Compact handoff: HKG flight information board
- Complete: the Flights directory now shows up to six compact arrival/departure records with localized route text, flight number, cargo marker, scheduled time, and status.
- Localization: English and Chinese values use the merged AAHK fields; Portuguese falls back to the English source because the official API languages are `en`, `zh_HK`, and `zh_CN`.
- Geometry decision: the reviewed official DATA.GOV.HK, AAHK, CAD, and CSDI results expose flight schedule/status or general airport documentation, but no authoritative machine-readable flight route-coordinate feed was found for this task. Do not invent aircraft paths.
- Evidence: full suite has 45 passing tests, lint/build/diff checks pass. Commit: `6d3eba0`.
- Next task: if aircraft visualization is required, add a clearly labeled static HKIA hub/airport geometry source or an approved external route dataset, then build a separate animation model with explicit provenance.

## Compact handoff: sourced HKIA facility contract
- Complete: added the typed `hkiaFacility` aerodrome reference point for HKG/VHHH, with English and Traditional Chinese names plus the official source URL.
- Coordinate provenance: `[113.9147222, 22.3088889]` is the WGS-84 conversion of the Hong Kong AIP AD 2.2 ARP value `221832N 1135453E`; this is a static airport context point, not a flight position.
- Scope: no runway, taxiway, terminal footprint, destination coordinate, or aircraft motion was inferred from this single point.
- Evidence: `src/dataAdapters/airport.test.ts` validates identity, coordinate, and map extent; focused tests, lint/build/diff checks pass. Commit: `4d6dfb2`.
- Next task: wire the facility into MapLibre and schematic rendering, then separately evaluate an approved runway/terminal geometry extract.

## Compact handoff: HKIA map context
- Complete: the official HKIA reference point is rendered as a dedicated MapLibre circle/label layer and an `HKIA` schematic marker; the initial camera and schematic bounds now include the airport area.
- Semantics: this is static aerodrome context only. Historical flight records remain in the information board and are not converted into aircraft positions.
- Evidence: full suite has 47 passing tests, lint/build/diff checks pass. Commit: `c0b8641`.
- Next task: evaluate a current static runway/terminal geometry extract, then implement a separately labeled flight replay layer only when route provenance and timing semantics are approved.
