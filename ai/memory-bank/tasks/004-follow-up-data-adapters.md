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

## Compact handoff: AIP runway context
- Complete: the three HKIA runway centerlines are represented by six official AIP threshold coordinates and rendered in both MapLibre and the schematic fallback.
- Source contract: current Hong Kong AIP page `https://www.ais.gov.hk/eaip_20260709/2026-07-09-000000/html/eAIP/VH-AD-2-VHHH-en-US.html`; thresholds are converted from DMS to WGS-84 decimal coordinates.
- Semantics: static runway context only; no taxi routes, flight paths, or aircraft positions are inferred.
- Evidence: `src/dataAdapters/airport.test.ts` covers all runway designators and the exact `07R/25L` conversion; full suite has 48 passing tests, lint/build/diff checks pass. Commit: `49af735`.
- Next task: add static terminal/aircraft-stand context only if an authoritative source is approved, then build a flight replay model with explicit route provenance.

## Compact handoff: HKIA movement replay
- Complete: AAHK historical flight records now produce clock-driven `flight` vehicles during a six-minute airport movement window; they render in MapLibre/schematic views and expose localized selection details.
- Provenance boundary: movement is constrained to the current AIP runway centerlines and is explicitly labeled `HKIA movement replay`; no destination, en-route path, live position, or real runway assignment is inferred.
- Timing contract: the adapter uses the record's Hong Kong scheduled time-of-day, tolerates midnight wraparound, and suppresses records outside the movement window.
- Evidence: `src/dataAdapters/airportReplay.test.ts` covers interpolation and outside-window suppression; full suite has 50 passing tests, lint/build/diff checks pass. Commits: `7196a9b`, `625311a`.
- Next task: add a static terminal/stand layer only after an authoritative geometry source is approved, then improve aircraft visual treatment without widening the telemetry claim.

## Compact handoff: HKIA static geometry source review
- Decision: do not add terminal, gate, apron, or parking-stand coordinates in this slice.
- Evidence: OpenStreetMap documents `aeroway=terminal`, `gate`, `apron`, and `parking_position`, but its core API is an editing API and the documentation recommends Overpass for read-only extraction. No versioned HKIA geometry snapshot with an approved refresh/licensing contract was established here.
- Guardrail: keep AIP runway context and the explicitly labeled runway movement replay; do not convert an unpinned OSM query or map tile into airport operational truth.
- Sources reviewed: `https://wiki.openstreetmap.org/wiki/API`, `https://wiki.openstreetmap.org/wiki/Tag:aeroway%3Dterminal`, and `https://wiki.openstreetmap.org/wiki/Aeroway`.
- Next task: choose and approve a pinned static geometry artifact or an explicit Overpass ingestion contract before adding terminal/stand rendering.

## Compact handoff: flight directory movement status
- Complete: the Flights directory now separates the historical AAHK record count from the active HKIA runway movement replay count.
- Localization: the active-movement label is available in English, Traditional Chinese, and Portuguese; README scope now matches the implemented modes.
- Evidence: full suite has 50 passing tests, lint/build/diff checks pass. Commit: `55330e0`.
- Known limitation: browser visual and interaction verification is still pending because the local browser harness is unavailable.
- Next task: approve a pinned terminal/stand geometry artifact or continue improving the trilingual aviation information surface without claiming live telemetry.

## Compact handoff: pinned HKIA ground context
- Complete: a pinned Overpass snapshot adds Terminal 1, Terminal 2, and eight representative tagged gate points; MapLibre and schematic renderers show terminals and gates as a dedicated ground-context layer.
- Provenance: every feature carries the Overpass query URL, OSM base timestamp `2026-08-28T03:58:21Z`, and ODbL attribution boundary. The snapshot is static and is not refreshed at runtime.
- Semantics: points are airport context only; they do not assign flights to gates, replace AIP runway geometry, or drive aircraft movement.
- Evidence: `src/dataAdapters/airportGround.test.ts` covers feature kinds, source metadata, and HKIA bounds; full suite has 52 passing tests, lint/build/diff checks pass. Commits: `051fe5c`, `f642d91`.
- Known risk: OSM geometry can change and must be re-pinned deliberately; browser visual verification remains pending because the local browser harness is unavailable.
- Next task: add a documented snapshot refresh procedure or improve terminal/gate localization before connecting any aircraft records to ground features.

## Compact handoff: trilingual HKIA ground labels
- Complete: Terminal 1, Terminal 2, and all eight representative gate points now carry English, Traditional Chinese, and Portuguese labels; MapLibre switches the ground layer with the active locale.
- Scope: label localization only; the pinned OSM snapshot, AIP runway source, and flight replay semantics are unchanged.
- Evidence: `src/dataAdapters/airportGround.test.ts` asserts the complete Portuguese label set; full suite has 52 passing tests, lint/build/diff checks pass. Commit: `4ab6a3d`.
- Known limitation: schematic gate labels use universal gate references and browser visual verification remains pending.
- Next task: document the snapshot refresh/review procedure before connecting any aircraft record to a terminal or gate.

## Compact handoff: active bus directory count
- Complete: the Buses directory header now reports the number of simulated `bus` vehicles, matching Rail, Ferries, Trams, and Flights; the body retains the normalized route total.
- Semantics: the count is clock-dependent vehicle state, while route count remains a static data-shape indicator.
- Evidence: full suite has 52 passing tests, lint/build/diff checks pass. Commit: `71eed0a`.
- Known limitation: browser visual verification remains pending; bus route rows are not individually selectable yet.
- Next task: add per-operator or route-level bus controls only if the directory can remain compact and consistent.

## Compact handoff: ferry and tram route directory
- Complete: Ferry and Tram menu sections now list each normalized route number and localized route name beneath their active vehicle counts.
- Scope: directory visibility only; route geometry, schedules, and simulation behavior are unchanged. The larger bus dataset remains summarized by active count and total route count.
- Evidence: full suite has 52 passing tests, lint/build/diff checks pass. Commit: `fd44a03`.
- Known limitation: ferry/tram rows are informational rather than individually filterable; browser visual verification remains pending.
- Next task: add route-level filtering only with a bounded control model that preserves the directory's compact layout.

## Compact handoff: Ferry and Tram route toggles
- Complete: Ferry and Tram route rows are now toggle controls; selection state is owned by `App` and filters active vehicles, MapLibre GeoJSON, and schematic paths consistently.
- Scope: all Ferry/Tram routes start enabled; Rail controls remain unchanged; the larger Bus dataset remains summarized to preserve menu density.
- Evidence: full suite has 52 passing tests, lint/build/diff checks pass. Commit: `42cb8b6`.
- Known limitation: browser interaction verification remains pending; no route-level controls were added for buses or flights in this slice.
- Next task: add a compact reset-all control or bounded Bus operator filtering only after interaction verification is available.

## Compact handoff: directory filter reset
- Complete: the directory header now exposes a trilingual `Reset filters` action that restores all Rail, Ferry, and Tram selections to their initial enabled state.
- Scope: reset state and compact styling only; no vehicle, route, or data-source semantics changed.
- Evidence: full suite has 52 passing tests, lint/build/diff checks pass. Commit: `856e426`.
- Known limitation: browser click verification remains pending; the reset action is intentionally text-labeled because it is an unfamiliar global command.
- Next task: add a bounded Bus operator filter only if the menu remains scannable after browser verification.

## Compact handoff: Bus operator filter
- Complete: the Buses directory now provides compact KMB/LWB and Citybus toggles; selected operators filter bus counts, route lines, and vehicle markers in both renderers.
- Mapping contract: `citybus-*` route IDs map to Citybus; other normalized bus IDs map to KMB/LWB. The existing reset action restores both operators.
- Scope: no feed, schedule, or vehicle-generation behavior changed; the operator filter only controls visibility.
- Evidence: full suite has 52 passing tests, lint/build/diff checks pass. Commit: `75d476b`.
- Known limitation: browser interaction verification remains pending; operator controls are not yet covered by component tests.
- Next task: add focused UI harness coverage or a bounded flight-record visibility control after browser tooling is available.

## Compact handoff: aircraft silhouettes
- Complete: HKIA replay vehicles now use a pointed directional footprint in the MapLibre extrusion layer and a matching clickable silhouette in the schematic renderer.
- Scope: visual treatment only; the six-minute runway movement replay, AIP geometry, and no-live-telemetry boundary are unchanged.
- Evidence: `src/layers/vehicleShapes.test.ts` covers the closed seven-vertex aircraft footprint and low-profile height; full suite has 53 passing tests, lint/build/diff checks pass. Commit: `f67b4bc`.
- Known limitation: browser visual verification remains pending; the silhouette is not an aircraft model or proof of real flight behavior.
- Next task: add focused UI/browser harness coverage for aircraft selection and locale rendering.

## Compact handoff: stale vehicle selection cleanup
- Complete: `App` now clears the selected vehicle whenever Rail, Ferry/Tram route, or Bus operator filters hide it; flight replay vehicles remain always visible under the current model.
- Contract: the pure `isVehicleVisible` predicate centralizes mode visibility rules and covers Citybus, Ferry, Rail, and Flight cases.
- Evidence: `src/app/vehicleVisibility.test.ts` passes; full suite has 54 passing tests, lint/build/diff checks pass. Commit: `1948211`.
- Known limitation: browser interaction verification remains unavailable because the integrated browser connection failed; no UI harness package was added.
- Next task: verify filter/reset/selection workflows in a working browser harness before expanding route controls.

## Compact handoff: replay flight identity labels
- Complete: each HKIA runway replay marker now prefixes its normalized AAHK flight number in English, Traditional Chinese, and Portuguese labels, linking the moving marker to the flight-board record.
- Scope: identity presentation only; runway selection, six-minute timing, static replay wording, and no-live-telemetry boundary are unchanged.
- Evidence: `src/dataAdapters/airportReplay.test.ts` asserts the localized `HX246` labels; full suite has 54 passing tests, lint/build/diff checks pass. Commit: `2bcdbee`.
- Known limitation: browser visual/interaction verification remains pending because the integrated browser connection is unavailable.
- Next task: verify localized aircraft selection in a working browser harness.

## Compact handoff: shared vehicle visibility predicate
- Complete: `MapView` now reuses the tested `isVehicleVisible` predicate from `App`, removing duplicated Bus operator and Ferry/Tram route visibility logic.
- Scope: behavior-preserving refactor; rail, bus, ferry, tram, flight, and stale-selection rules are now represented by one deterministic contract.
- Evidence: full suite has 54 passing tests, lint/build/diff checks pass. Commit: `2505601`.
- Known limitation: Vite starts successfully, but both Pencil and Node/Playwright browser paths are unavailable in this environment; no browser claim is made.
- Next task: run the directory filter, reset, aircraft selection, and locale workflows in a working browser harness.

## Compact handoff: HKIA provenance status
- Complete: Data Status now exposes the current HKIA AIP revision, pinned OSM snapshot date, and direct links to both source contracts.
- Scope: provenance visibility only; no runtime fetch, geometry, or simulation behavior changed.
- Evidence: full suite has 54 passing tests, lint/build/diff checks pass. Commit: `9963750`.
- Known limitation: the source labels are intentionally compact and browser link verification remains pending because browser tooling is unavailable.
- Next task: verify the source links and filter/reset/aircraft workflows in a working browser harness.

## Compact handoff: progressive transit loading
- Complete: `useTransitData` now resolves the four local rail assets first and clears the initial loading state before optional KMB, Citybus, ferry, and tram requests finish.
- Failure policy: optional adapters remain individually failure-tolerant and merge into the established `TransitData`; GTFS and HKG flight hydrations remain independent asynchronous phases.
- Scope: loading order and perceived startup only; source URLs, normalized data contracts, and simulation behavior are unchanged.
- Evidence: full suite has 54 passing tests, lint/build/diff checks pass. Commit: `f618a64`.
- Known risk: browser/network timing verification remains pending; optional feeds may appear after the base map and should be treated as hydration states.
- Next task: verify progressive loading and source-link behavior in a working browser harness.

## Compact handoff: visible data-layer manifest
- Complete: the Data Status directory now reads from one typed manifest covering MTR, Light Rail, buses, ferries, trams, flights, HKIA AIP geometry, and HKIA ground context.
- Semantics: entries classify current behavior as static, scheduled, live, or replay; the registry documents existing sources only and does not add runtime fetches.
- Evidence: `src/dataAdapters/layerManifest.test.ts` covers unique registration and representative classifications; full suite has 56 passing tests, lint/build/diff checks pass. Commit: `cd22af7`.
- Known limitation: browser rendering and link-click verification remain pending because the integrated browser harness is unavailable; the manifest is not a freshness monitor.
- Next task: validate the Data Status links and progressive-loading states in a working browser harness before adding more layer controls.

## Compact handoff: trilingual data-layer status
- Complete: every manifest entry now provides explicit English, Traditional Chinese, and Portuguese labels plus localized source names for the Data Status directory.
- Scope: localization contract only; layer classifications, source URLs, loading behavior, and simulation behavior are unchanged.
- Evidence: `src/dataAdapters/layerManifest.test.ts` asserts all three locale values for every entry; full suite has 57 passing tests, lint/build/diff checks pass. Commit: `5f9c338`.
- Known limitation: browser locale switching and source-link rendering remain unverified because the integrated browser harness is unavailable.
- Next task: perform browser verification for all three locales and continue the remaining reference-derived interaction gaps.

## Compact handoff: Hong Kong simulation time control
- Complete: the control panel now exposes a `datetime-local` input that jumps the schedule simulation to Hong Kong wall time and pauses it at the selected instant.
- Correctness: parsing uses the fixed Asia/Hong_Kong UTC+8 conversion and rejects malformed or impossible calendar values; `Now` and playback controls remain unchanged.
- Evidence: `src/engines/hongKongDateTime.test.ts` covers round-trip conversion and invalid input; full suite has 59 passing tests, lint/build/diff checks pass. Commit: `eec1697`.
- Known limitation: browser keyboard/input interaction and locale-specific control rendering remain unverified because the integrated browser harness is unavailable.
- Next task: validate date/time, locale, filter, and source-link workflows in a working browser harness; then address remaining reference-derived follow/focus interactions.

## Compact handoff: selected-vehicle map focus
- Complete: selecting a visible vehicle now recenters the MapLibre view on its current coordinates as the schedule simulation advances; clearing or losing the selection stops recentering.
- Contract: `selectedVehicleCenter` is a pure lookup over visible vehicles, so hidden filtered vehicles cannot move the map.
- Evidence: `src/components/map/MapView.test.ts` covers selected, missing, and cleared IDs; full suite has 61 passing tests, lint/build/diff checks pass. Commit: `c7cfa33`.
- Test note: the MapLibre-focused jsdom test supplies the missing `URL.createObjectURL` browser API before module import.
- Known limitation: real browser camera movement, touch behavior, and user pan-versus-follow ergonomics remain unverified because the integrated browser harness is unavailable.
- Next task: validate selection/focus in a working browser, then add an explicit follow toggle only if automatic focus proves too intrusive.

## Compact handoff: empty-map deselection
- Complete: clicking empty map space now clears the selected vehicle, stopping automatic recentering and restoring manual map exploration; clicking a vehicle remains a selection action.
- Contract: the map click handler clears only when no vehicle feature is under the pointer; the pure `shouldClearVehicleSelection` helper covers that boundary.
- Evidence: `src/components/map/MapView.test.ts` covers empty and occupied feature counts; full suite has 62 passing tests, lint/build/diff checks pass. Commit: `2024c81`.
- Known limitation: actual MapLibre event ordering, touch taps, and camera ergonomics remain unverified because the integrated browser harness is unavailable.
- Next task: run browser interaction checks before deciding whether automatic focus needs an explicit follow toggle.

## Compact handoff: selected flight details
- Complete: the selected-flight panel now resolves the replay vehicle to its normalized AAHK record and shows flight numbers, airline code, localized route, scheduled time, localized status, cargo marker, and movement progress.
- Semantics: the panel remains a replay information surface; it does not imply live aircraft telemetry or add en-route flight paths.
- Resilience: if a replay vehicle has no matching source record, the existing localized marker and progress remain available without a render failure.
- Evidence: `src/components/map/InfoPanel.test.ts` covers record resolution and missing records; full suite has 64 passing tests, lint/build/diff checks pass. Commit: `99d50ec`.
- Known limitation: browser selection, locale switching, and information-panel layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate flight selection in a working browser, then continue remaining reference-derived controls such as explicit follow mode or live/simulated bus mode.

## Compact handoff: live and scheduled bus mode
- Complete: the control panel now exposes a trilingual Live bus ETA toggle; enabled mode uses loaded ETA arrivals, while disabled mode uses deterministic schedule replay.
- Fallback: the toggle is disabled when no ETA feed is loaded, and schedule replay remains available regardless of optional feed failure.
- Scope: source selection only; route filtering, vehicle visibility, and the existing ETA/schedule interpolation contracts are unchanged.
- Evidence: full suite has 64 passing tests, lint/build/diff checks pass. Commit: `ff5d502`.
- Known limitation: browser toggle interaction, late optional-feed hydration, and visible mode-state confirmation remain unverified because the integrated browser harness is unavailable.
- Next task: validate the toggle in a working browser and add a focused state test if the UI harness becomes available.

## Compact handoff: selected ferry and tram details
- Complete: selected Ferry and Tram vehicles now resolve their route records and show localized route name, operator, route number, journey duration, and progress in the information panel.
- Localization: confirmed source files are UTF-8; Traditional Chinese panel labels use stable Unicode escapes, avoiding console-decoding ambiguity.
- Scope: information presentation only; route geometry, schedules, vehicle positions, and selection/focus behavior are unchanged.
- Evidence: `src/components/map/InfoPanel.test.ts` covers Ferry and Tram route resolution; full suite has 65 passing tests, lint/build/diff checks pass. Commit: `50e887a`.
- Known limitation: browser selection and panel layout across three locales remain unverified because the integrated browser harness is unavailable.
- Next task: validate all selected-vehicle information panels in a working browser before further feature expansion.

## Compact handoff: selected bus details
- Complete: selected Bus vehicles now resolve their normalized route records and show localized route name, operator, route number, and progress in the information panel.
- Contract: Ferry, Tram, and Bus records share the route resolver; journey duration remains shown only for modes that provide it.
- Scope: information presentation only; live ETA versus schedule mode, filtering, geometry, and vehicle movement are unchanged.
- Evidence: `src/components/map/InfoPanel.test.ts` covers Bus route resolution; full suite has 66 passing tests, lint/build/diff checks pass. Commit: `444fb13`.
- Known limitation: browser selection, late ETA hydration, and panel layout across three locales remain unverified because the integrated browser harness is unavailable.
- Next task: validate the complete selected-vehicle information workflow in a working browser.

## Compact handoff: station selection details
- Complete: stations are now selectable in both MapLibre and SVG schematic renderers; the information panel shows localized station name, line IDs, and coordinates.
- Interaction: vehicle and station selections are mutually exclusive, and empty map clicks clear both selections.
- Scope: station information and selection only; station geometry, route filters, and schedule simulation are unchanged.
- Evidence: full suite has 66 passing tests, lint/build/diff checks pass. Commit: `b3ca879`.
- Known limitation: real browser click ordering, touch behavior, and panel layout across three locales remain unverified because the integrated browser harness is unavailable.
- Next task: validate station and vehicle selection in a working browser before adding more interaction controls.

## Compact handoff: fallback selection invariant
- Complete: SVG fallback vehicle clicks now clear any selected station before selecting a vehicle, matching the MapLibre click path for aircraft and surface vehicles.
- Scope: selection state consistency only; no new dependency, script, data source, or simulation behavior was added.
- Evidence: full suite has 66 passing tests, lint/build/diff checks pass. Commit: `5943afe`.
- Known limitation: real browser event ordering and touch behavior across both renderers remain unverified because the integrated browser harness is unavailable.
- Next task: validate station and vehicle selection parity in a working browser.

## Compact handoff: localized station panel labels
- Complete: station details now use localized Station, Lines, and Coordinates labels, and rail progress uses the same English, Traditional Chinese, and Portuguese label contract.
- Semantics: station identity is no longer presented as a destination; route and vehicle behavior are unchanged.
- Evidence: `src/components/map/InfoPanel.test.ts` covers the locale label contract; full suite has 67 passing tests, lint/build/diff checks pass. Commit: `9f8e305`.
- Known limitation: browser locale switching and panel layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate all localized information panels in a working browser.

## Compact handoff: localized station line names
- Complete: station details now resolve rail line IDs to localized line names in English, Traditional Chinese, and Portuguese; unknown IDs remain visible as a safe fallback.
- Scope: station information presentation only; station selection, route filters, and simulation behavior are unchanged.
- Evidence: `src/components/map/InfoPanel.test.ts` covers localized resolution and ID fallback; full suite has 68 passing tests, lint/build/diff checks pass. Commit: `ce73346`.
- Known limitation: browser locale switching and station-panel layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate localized station and vehicle information panels in a working browser.

## Compact handoff: active bus data mode
- Complete: Data Status now reports the effective bus mode in English, Traditional Chinese, and Portuguese: Live ETA when the feed is loaded and selected, otherwise Schedule replay.
- Scope: observability only; the existing toggle and fallback vehicle-generation behavior are unchanged.
- Evidence: full suite has 68 passing tests, lint/build/diff checks pass. Commit: `f14d00b`.
- Known limitation: browser hydration timing, toggle state, and localized status rendering remain unverified because the integrated browser harness is unavailable.
- Next task: validate Data Status mode reporting and the full bus toggle workflow in a working browser.

## Compact handoff: station search
- Complete: the directory now includes a compact trilingual station selector; selecting a station updates the shared station selection state, clears vehicle selection, and focuses the map on that station.
- Renderer behavior: the same selected-station state is shared by MapLibre and SVG schematic views; empty map clicks still clear selection.
- Scope: search and focus only; station data, route filters, and simulation behavior are unchanged.
- Evidence: full suite has 68 passing tests, lint/build/diff checks pass. Commit: `2234f4b`.
- Known limitation: browser select interaction, map recentering, touch behavior, and three-locale layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate station search and selection in a working browser before adding route search.

## Compact handoff: Portuguese HKIA map label
- Complete: HKIA facility data now includes an explicit Portuguese name, MapLibre GeoJSON carries it, and the map label selector uses it for the Portuguese locale.
- Scope: airport label localization only; AIP geometry, ground context, flight replay, and selection behavior are unchanged.
- Evidence: `src/dataAdapters/airport.test.ts` asserts the Portuguese facility name; full suite has 68 passing tests, lint/build/diff checks pass. Commit: `8c77518`.
- Known limitation: browser locale switching and Portuguese map-label rendering remain unverified because the integrated browser harness is unavailable.
- Next task: validate all three locale map labels and station search in a working browser.

## Compact handoff: playback keyboard shortcut
- Complete: pressing Space outside form controls now toggles simulation play/pause; repeated keydown events are ignored and the browser default scroll action is prevented.
- Scope: playback input only; speed, date/time control, `Now`, and simulation timing semantics are unchanged.
- Evidence: `src/hooks/useSimulationClock.test.ts` covers accepted, repeated, and form-control key events; full suite has 70 passing tests, lint/build/diff checks pass. Commit: `dad00ee`.
- Known limitation: browser focus management, keyboard layout, and touch behavior remain unverified because the integrated browser harness is unavailable.
- Next task: validate keyboard and station-search workflows in a working browser.

## Compact handoff: localized route search contract
- Complete: `searchRoutes` now provides a typed, order-preserving search contract across Rail, Bus, Ferry, and Tram records, matching IDs, operators, English names, Traditional Chinese names, and Portuguese names.
- Scope: pure search foundation only; no directory filtering or map behavior changed in this slice.
- Evidence: `src/app/routeSearch.test.ts` covers operator, localized-name, and empty-query behavior; full suite has 72 passing tests, lint/build/diff checks pass. Commit: `f7c213a`.
- Known limitation: the helper is not yet exposed in the UI, and browser search interaction remains unavailable for verification.
- Next task: wire the search contract into one compact directory control and connect route selection to map focus.

## Compact handoff: route search UI
- Complete: the directory now exposes a trilingual route search input covering MTR, Light Rail, Bus, Ferry, and Tram routes; results are capped at eight for compact scanning.
- Interaction: selecting a result focuses the MapLibre view on the route geometry while preserving existing visibility toggles and filter state.
- Scope: navigation/focus only; route search does not enable or disable a route.
- Evidence: full suite has 72 passing tests, lint/build/diff checks pass. Commit: `2ccb02a`.
- Known limitation: browser typing, result selection, map focus, touch behavior, and three-locale layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate route search in a working browser before adding broader route-level filtering.

## Compact handoff: route search focus coverage
- Complete: route-focus geometry lookup is now a pure helper used by MapLibre, returning the first geometry point for a selected route and null for missing or cleared selections.
- Scope: testability only; route search UI and map behavior are unchanged.
- Evidence: `src/components/map/MapView.test.ts` covers selected, missing, and cleared route IDs; full suite has 73 passing tests, lint/build/diff checks pass. Commit: `dae606c`.
- Known limitation: browser route search, map focus, touch behavior, and locale layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate route search in a working browser before broader route-level filtering.

## Compact handoff: localized simulation clock
- Complete: the simulation time readout now selects `en-GB`, `zh-HK`, or `pt-PT` from the active locale while retaining the Asia/Hong_Kong timezone.
- Scope: display formatting only; clock progression, date-time input parsing, and playback controls are unchanged.
- Evidence: `src/components/map/ControlPanel.test.ts` covers all three locale mappings; full suite has 74 passing tests, lint/build/diff checks pass. Commit: `d11a61b`.
- Known limitation: browser locale switching and rendered date formatting remain unverified because the integrated browser harness is unavailable.
- Next task: validate locale switching and route-search interactions in a working browser.

## Compact handoff: searched route highlight
- Complete: selecting a route-search result now highlights the route with a dedicated MapLibre line source/layer and a matching SVG schematic stroke.
- Lifecycle: route selection is synchronized through the MapLibre initialization ref and reactive source update, avoiding stale highlight state or hook warnings.
- Scope: visual confirmation only; route search remains navigation/focus and does not change visibility filters.
- Evidence: `src/components/map/MapView.test.ts` covers selected-route geometry lookup; full suite has 74 passing tests, lint/build/diff checks pass. Commit: `4f80d7d`.
- Known limitation: browser search, highlight visibility, touch behavior, and locale layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate route search and highlight in a working browser before broader route-level filtering.

## Compact handoff: Escape deselection shortcut
- Complete: pressing Escape now clears selected vehicle, station, and route-search focus, returning the map to neutral exploration without changing visibility filters.
- Lifecycle: the MapView initialization handler uses synchronized callback refs, so the shortcut remains stable across App renders.
- Scope: keyboard selection clearing only; playback Space handling and map click selection remain unchanged.
- Evidence: `src/components/map/MapView.test.ts` covers Escape recognition; full suite has 75 passing tests, lint/build/diff checks pass. Commit: `a6a5acc`.
- Known limitation: browser keyboard focus, touch behavior, and route-highlight clearing remain unverified because the integrated browser harness is unavailable.
- Next task: validate keyboard and route-search workflows in a working browser.

## Compact handoff: optional feed status
- Complete: Data Status now distinguishes pending, ready, and unavailable for optional transit feeds, GTFS schedules, and HKG flights during progressive hydration.
- Semantics: status is phase-level observability; an empty successful normalized feed is unavailable, and base-rail failure marks optional phases unavailable.
- Scope: status reporting only; source loaders and simulation behavior are unchanged.
- Evidence: full suite has 75 passing tests, lint/build/diff checks pass. Commit: `91aa37f`.
- Known limitation: browser hydration timing and localized status rendering remain unverified because the integrated browser harness is unavailable.
- Next task: validate feed status in a working browser before adding further data-source controls.

## Compact handoff: filter-aligned directory counts
- Complete: MTR, Light Rail, Bus, Ferry, Tram, and Flight directory summary counts now use the shared `isVehicleVisible` contract and reflect active line, route, and operator filters.
- Scope: count presentation only; vehicle generation, map filtering, and filter state semantics are unchanged.
- Evidence: `src/app/vehicleVisibility.test.ts` covers filtered counts for rail, ferry, bus, and flight modes; full suite has 76 passing tests, lint/build/diff checks pass. Commit: `6d14efd`.
- Known limitation: browser filter interaction and rendered count updates remain unverified because the integrated browser harness is unavailable.
- Next task: validate the directory filter workflow in a working browser before adding further controls.

## Compact handoff: selectable airport facility
- Complete: HKIA is now selectable from both the MapLibre facility layer and the SVG schematic hotspot; the information panel shows localized airport name, IATA, ICAO, coordinates, and the AIP source link.
- Selection contract: choosing HKIA clears vehicle and station selection; choosing a vehicle or station clears HKIA selection; Escape clears all three selection types.
- Provenance: the facility remains the static AIP aerodrome reference point and does not imply live airport telemetry or en-route flight geometry.
- Evidence: full suite has 76 passing tests, lint/build/diff checks pass. Commit: `f6e75cb`.
- Known limitation: browser hit testing, panel layout, and locale rendering remain unverified because the integrated browser harness is unavailable.
- Next task: validate HKIA and aircraft selection workflows in a working browser before adding more airport controls.

## Compact handoff: selected airport highlight
- Complete: the selected HKIA facility now receives a larger, heavier-stroked marker in both the MapLibre layer and SVG schematic, driven by the shared selected facility ID.
- Scope: selection feedback only; AIP facility data, airport geometry, and flight replay semantics are unchanged.
- Evidence: full suite has 76 passing tests, lint/build/diff checks pass. Commit: `a47893a`.
- Known limitation: browser visual confirmation of the highlight and three-locale layout remains unverified because the integrated browser harness is unavailable.
- Next task: validate HKIA and aircraft selection workflows in a working browser before adding more airport controls.

## Compact handoff: transport source links
- Complete: the directory layer manifest now links Buses to the DATA.GOV.HK hub and Ferries/Trams to the exact static GTFS source directory used by the staged loaders.
- Scope: source provenance only; loading, normalization, simulation, and UI behavior are unchanged.
- Evidence: `src/dataAdapters/layerManifest.test.ts` asserts the external source URLs; full suite has 77 passing tests, lint/build/diff checks pass. Commit: `f70316b`.
- Known limitation: browser link navigation and source availability at runtime remain unverified; source freshness is still represented separately by feed status.
- Next task: validate directory source links and feed status in a working browser before adding further data-source controls.

## Compact handoff: expired vehicle selection
- Complete: selected vehicle details are now cleared when the selected vehicle ID leaves the current simulation frame, including schedule-window expiry or feed-driven replacement; filter visibility remains part of the same validity check.
- Scope: selection lifecycle only; vehicle generation, schedule timing, and map rendering are unchanged.
- Evidence: `src/app/vehicleVisibility.test.ts` covers present, absent, and mismatched selected vehicles; full suite has 78 passing tests, lint/build/diff checks pass. Commit: `627f9f3`.
- Known limitation: browser time advancement and panel disappearance remain unverified because the integrated browser harness is unavailable.
- Next task: validate time progression, vehicle selection, and panel clearing in a working browser.

## Compact handoff: selectable airport ground context
- Complete: representative OSM snapshot terminals and gates at HKIA are now selectable in MapLibre and the SVG schematic; the panel shows localized feature name/type, reference, coordinates, snapshot timestamp, and OSM source link.
- Selection contract: ground features clear airport facility, station, and vehicle selection; the inverse selection paths also clear ground context.
- Provenance: these are pinned static OSM context points, not live airport operations or aircraft telemetry.
- Evidence: full suite has 78 passing tests, lint/build/diff checks pass. Commit: `7a006a1`.
- Known limitation: browser hit testing, selection highlight, and localized panel layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate HKIA facility, terminal/gate, and aircraft selection workflows in a working browser.

## Compact handoff: selected airport ground highlight
- Complete: the selected OSM terminal or gate now receives a larger radius and heavier stroke in MapLibre, matching the existing SVG schematic highlight.
- Lifecycle: the selected ground-feature ID is synchronized through the MapView ref and reactive source update, so selection feedback survives map initialization and later state changes.
- Scope: visual selection feedback only; OSM snapshot data, timestamps, and airport telemetry boundaries are unchanged.
- Evidence: full suite has 78 passing tests, lint/build/diff checks pass. Commit: `498db5b`.
- Known limitation: browser visual confirmation remains unavailable.
- Next task: validate HKIA facility, terminal/gate, and aircraft selection workflows in a working browser.

## Compact handoff: airport directory submenu
- Complete: the main directory now includes a compact HKIA submenu with selectable airport facility, Terminal 1, Terminal 2, and representative gate entries.
- Interaction: directory selections use the same shared App state as map selections, clear competing station/vehicle/ground context, and update the localized information panel.
- Scope: navigation and selection access only; airport data, OSM snapshot provenance, and replay semantics are unchanged.
- Evidence: full suite has 78 passing tests, lint/build/diff checks pass. Commit: `0c40879`.
- Known limitation: browser menu interaction, responsive layout, and locale rendering remain unverified because the integrated browser harness is unavailable.
- Next task: validate the full HKIA directory and map selection workflow in a working browser.

## Compact handoff: feed status markers
- Complete: Data Status now renders pending, ready, and unavailable feed values with semantic, color-coded markers while retaining their text labels and trilingual status wording.
- Scope: presentation only; progressive loading, feed phases, and source links are unchanged.
- Evidence: full suite has 78 passing tests, lint/build/diff checks pass. Commit: `a31e761`.
- Known limitation: browser color contrast, hydration transitions, and responsive layout remain unverified because the integrated browser harness is unavailable.
- Next task: validate feed status transitions and directory readability in a working browser.

## Compact handoff: NLB and GMB source contract
- Complete: official Hong Kong source research now records NLB route/stop/ETA endpoints and GMB route/stop/ETA endpoints, including GMB's documented minute-level ETA cadence.
- Decision: NLB/GMB remain future adapters; no route geometry, request fan-out, timetable headway, or vehicle replay was invented from ETA data.
- Acceptance gate for implementation: verify stop-coordinate coverage, choose a bounded sample, record concurrency/freshness policy, and label movement semantics explicitly.
- Evidence: `docs/data-sources/hong-kong-open-data.md` updated; source pages reviewed on 2026-08-28. No runtime code changed.
- Known limitation: NLB/GMB are not yet loaded or simulated in the app.
- Next task: implement one bounded NLB adapter slice only after validating the route-stop response shape and coordinate source.

## Compact handoff: NLB route normalizer
- Complete: added a Zod-validated pure NLB adapter that maps official route and route-stop responses into the shared `BusRoute` contract with English/Traditional Chinese names, ordered coordinates, and `NLB` operator identity.
- Guardrails: routes with fewer than two stops are omitted; no network calls, ETA movement, timetable headway, or UI wiring were added in this slice.
- Evidence: `src/dataAdapters/nlb.test.ts` covers localized normalization, coordinate coercion, and incomplete-route omission; full suite has 80 passing tests, lint/build/diff checks pass. Commit: `09d7c3c`.
- Known limitation: runtime loading and NLB ETA integration remain pending; Portuguese currently uses the shared fallback because the official NLB response has no Portuguese field.
- Next task: add bounded NLB route/stop loading and operator visibility wiring with an explicit request-volume limit.

## Compact handoff: staged NLB route feed
- Complete: optional hydration now loads the NLB route catalog and stops for the four approved featured route IDs, normalizes them into bus route geometry, and exposes `NLB` in the bus operator directory filter.
- Request budget: one route-catalog request plus at most four stop requests, with stop requests capped at concurrency two; any failure remains isolated from the rail baseline and other optional feeds.
- Scope: route geometry and operator visibility only; NLB ETA loading, vehicle movement, and timetable replay were not added.
- Evidence: pure adapter tests remain green; full suite has 80 passing tests, lint/build/diff checks pass. Commit: `c66e35b`.
- Known limitation: runtime network hydration and directory rendering remain unverified in a browser; NLB Portuguese names use the shared English fallback because the official response has no Portuguese field.
- Next task: add bounded NLB ETA normalization and decide whether a single featured route can support live vehicle visualization without excessive requests.

## Compact handoff: NLB ETA normalizer
- Complete: the NLB adapter now normalizes official ETA responses into shared `BusArrival` records, converts source timestamps to explicit Hong Kong `+08:00` ISO values, and strips HTML from the service message.
- Contract: route ID, stop sequence, and localized destination are supplied by the caller because NLB ETA records do not repeat all route-stop context.
- Guardrails: invalid arrival timestamps are omitted; no network polling, request fan-out, timetable headway, or vehicle movement was added.
- Evidence: `src/dataAdapters/nlb.test.ts` covers valid/invalid timestamps, message cleanup, sequence IDs, and destination context; full suite has 81 passing tests, lint/build/diff checks pass. Commit: `187a761`.
- Known limitation: runtime NLB ETA loading and live vehicle visualization remain pending.
- Next task: add one bounded NLB ETA loader for the approved featured route/stop sample and measure request volume before wiring movement.

## Compact handoff: staged NLB ETA sample
- Complete: optional hydration now loads NLB ETA data for featured route `1` and its first six ordered stops, normalizes arrivals, and merges them into the shared bus-arrival feed used by the live ETA simulation mode.
- Request budget: one NLB route catalog request, four featured-route stop requests, and at most six ETA requests; stop and ETA fan-out are each capped at concurrency two.
- Semantics: NLB route geometry remains browseable for four featured routes; moving NLB markers appear only when adjacent-stop ETA predictions share route, destination, and arrival sequence.
- Scope: bounded ETA sample only; no timetable headway was inferred and GMB remains unimplemented.
- Evidence: full suite has 81 passing tests, lint/build/diff checks pass. Commit: `e4e330b`.
- Known limitation: live network hydration and NLB marker rendering remain unverified in a browser; Portuguese names use the shared English fallback.
- Next task: validate NLB runtime requests and marker behavior in a working browser before expanding route or operator coverage.

## Compact handoff: GMB route normalizer
- Complete: added a Zod-validated pure GMB adapter that maps official route directions, ordered route stops, and nested WGS84 stop coordinates into shared `BusRoute` records.
- Guardrails: directions with fewer than two stops or any missing coordinate are omitted; no timetable headway or vehicle movement is inferred.
- Evidence: `src/dataAdapters/gmb.test.ts` covers ordered geometry and incomplete-coordinate omission. Commit: `9692ef7`.
- Next task: add bounded runtime loading for one approved route and preserve the provider request budget.

## Compact handoff: bounded GMB runtime loading
- Complete: optional hydration loads GMB HKI route `1`, both directions, up to six ordered stops per direction, and deduplicated stop coordinates.
- Request policy: route-stop and stop requests use concurrency two; failures remain isolated from the base transit map.
- Semantics: this slice provides bounded route geometry only; it does not infer schedules or claim live vehicle telemetry.
- Evidence: mocked official payload-shape coverage plus full suite of 84 passing tests and passing build. Commit: `733b4c1`.
- Next task: validate live network hydration in a working browser before expanding GMB route coverage.

## Compact handoff: GMB operator visibility
- Complete: GMB is available in the bus operator directory, and `NLB`/`GMB` vehicle prefixes now map to their own operator filters.
- Evidence: full suite of 84 passing tests and passing build. Commits: `6bf7d7f`, `13df97f`.
- Known limitation: live marker rendering and operator toggle interaction remain unverified because the integrated browser harness is unavailable.

## Compact handoff: transport tool switches
- Complete: Rail, Light Rail, Buses, Ferries, Trams, and Flights each have an `ON/OFF` control in the directory menu.
- Interaction: switches reuse the existing line, route, operator, and flight visibility state; Reset restores all transport tools.
- Evidence: full suite of 83 passing tests and passing build. Commit: `cdbb60f`.
- Known limitation: browser interaction, responsive layout, and localized labels remain unverified because the integrated browser harness is unavailable.

## Compact handoff: GMB ETA normalizer
- Complete: `normalizeGmbEta` validates official GMB route-stop ETA responses, preserves absolute timestamps and English remarks, and maps ETA sequence/context into shared `BusArrival` records.
- Guardrails: disabled entries and invalid timestamps are omitted; no timetable headway is inferred.
- Evidence: `src/dataAdapters/gmb.test.ts` covers multiple arrivals and invalid/disabled records. Full suite has 86 passing tests. Commit: `ee3441c`.
- Next task: wire a bounded GMB ETA request sample into the runtime only after preserving route/stop request limits.

## Compact handoff: bounded GMB ETA runtime
- Complete: optional hydration now loads ETA for the sampled GMB route directions and sampled stops, then merges normalized records into the shared bus-arrival feed.
- Request policy: ETA requests reuse the six-stop-per-direction cap and concurrency-two worker pool; failures remain optional.
- Semantics: GMB markers use ETA interpolation only when adjacent-stop predictions are available; no fixed timetable is fabricated.
- Evidence: mocked official payload-shape coverage plus full suite of 87 passing tests and passing build. Commit: `75820f3`.
- Known limitation: live network hydration, marker movement, and ETA freshness behavior remain unverified in a working browser.

## Compact handoff: GMB ETA resilience and freshness
- Complete: individual GMB ETA request failures now degrade to empty arrivals while retaining successful route geometry and other ETA records.
- Freshness: the optional bus timestamp now considers the latest valid GMB arrival timestamp alongside the KMB feed timestamp.
- Evidence: regression coverage verifies route retention after one ETA failure; full suite has 88 passing tests, lint, build, and diff checks pass. Commit: `af0012f`.
- Known limitation: live provider behavior and browser marker movement remain unverified; no retry loop or polling was added.

## Compact handoff: GMB source provenance
- Complete: the Data Status layer manifest now identifies GMB as a live bus source with its exact DATA.GOV.HK dataset URL and localized source labels.
- Scope: provenance presentation and manifest coverage only; feed loading and simulation behavior are unchanged.
- Evidence: `src/dataAdapters/layerManifest.test.ts` asserts the GMB entry, live classification, URL, and locale labels. Focused test, lint, build, and diff checks pass. Commit: `0a2deb1`.
- Known limitation: browser link navigation remains unverified because the integrated browser connector is unavailable.

## Compact handoff: vehicle follow control
- Complete: the control panel now exposes a trilingual `Follow vehicle` toggle for selected-vehicle camera recentering.
- Semantics: the toggle defaults ON to preserve prior behavior; OFF leaves selection and playback active while allowing independent map panning.
- Evidence: focused control/map tests, full suite of 88 tests, lint, and build pass. Commit: `674f116`.
- Known limitation: real MapLibre camera interaction, touch behavior, and responsive control layout remain unverified because the Pencil browser connector is unavailable.

## Compact handoff: transport OFF consistency
- Complete: Rail and Light Rail lines are now removed from both MapLibre and SVG rendering when their transport-level `OFF` switch is active, matching the behavior of buses, ferries, trams, and flights.
- Scope: source filtering only; individual line toggles and transport simulation remain unchanged.
- Evidence: full suite of 88 tests, lint, build, and diff checks pass. Commit: `751dfb6`.
- Known limitation: browser click interaction and visual confirmation remain unavailable because the integrated Pencil desktop connector cannot connect.

## Compact handoff: reference visual parity
- Complete: compared Mini Tokyo 3D and Mini Map Macau live reference behavior with the Hong Kong map.
- Finding: the Hong Kong renderer drew every normalized bus route, unlike the references' active/selected route emphasis; the screenshot's key-required overlay was absent from the current repository source.
- Fix: bus geometry now follows visible bus vehicles in the current frame; the source remains searchable and the full route count remains in the directory. Raster tiles now use OpenStreetMap with attribution.
- Evidence: focused visibility test, lint, build, and diff checks pass.
- Known limitation: no live browser proof of tile delivery because the integrated browser connector remains unavailable.

## Compact handoff: route directory map focus
- Complete: route directory selections now return focus to the map in both MapLibre and SVG rendering.
- Behavior: selected routes are highlighted and temporarily rendered even when inactive; the map fits the selected geometry while preserving room for the directory panel.
- Evidence: focused MapView tests, lint, and build pass.
- Known limitation: live click and camera movement remain unverified without the integrated browser connector.

## Compact handoff: OSM-derived 3D buildings
- Complete: MapLibre now loads an independent OpenFreeMap vector source and extrudes the `building` layer from OSM-derived height fields.
- Fallback: the existing OSM raster source remains underneath the 3D layer; transit data and route geometry are unchanged.
- Evidence: focused MapView tests, lint, and build pass.
- Known limitation: browser runtime failed before tab creation, so live tile delivery and visual framing remain unverified.

## Compact handoff: service-aware route counts
- Complete: bus operator rows now show active routes over total normalized routes.
- Semantics: active is derived from the current visible bus vehicles; total is the complete operator feed.
- Evidence: focused route-service test, lint, and build pass.

## Compact handoff: simulation timeline
- Complete: a bottom timeline scrubber now drives the existing simulation clock and supports time-of-day selection on the current Hong Kong calendar day.
- Layout: desktop center-bottom placement; mobile placement above the info panel.
- Evidence: focused ControlPanel test, lint, and build pass.
- Known limitation: rendered interaction remains unverified because the browser runtime failed before tab creation.

## Compact handoff: urban 3D default camera
- Complete: the initial camera now focuses central Hong Kong at zoom 12.4 with 58-degree pitch so the OSM-derived building layer can appear immediately.
- Navigation: route and feature selection still re-centre or fit the map as before.
- Evidence: focused MapView test, lint, and build pass.

## Compact handoff: browser QA blocker
- Attempted a second local browser verification pass after starting Vite on port 5183.
- The browser runtime again failed before tab creation with an OS path error; the server was stopped and no visual pass is claimed.
- Code-level evidence remains: 25 test files, 93 tests, lint, and build pass.

## Compact handoff: light/dark 3D basemap mode
- Complete: the existing 2D/3D control now switches between a readable light OSM raster and a darkened raster presentation for the 3D scene.
- Data boundary: both modes reuse the same raster tiles; building vectors and transit data remain separate.
- Evidence: focused MapView tests, lint, build, and diff checks pass.

## Compact handoff: route selection detail workflow
- Complete: selected route state now flows from the directory to map focus and the information panel.
- Behavior: selecting a route clears competing object selections, highlights/fits the route, and displays localized metadata plus an OSM marker link.
- Evidence: focused MapView and InfoPanel tests, lint, and build pass.

## Compact handoff: moving vehicle route trails
- Complete: a separate MapLibre trail layer now renders progress behind each visible moving vehicle using existing route geometry.
- Modes: flights, MTR, Light Rail, buses, ferries, and trams share the same derived trail contract with mode-aware styling.
- Evidence: focused vehicle-shape test, lint, and build pass.
- Known limitation: trail appearance remains unverified in a live browser because the browser runtime cannot create a tab.

## Compact handoff: directory and map layer authority
- Complete: the transport directory can collapse to a narrow control rail and expand again without changing filter state.
- Complete: the legacy SVG schematic overlay and its projection helpers were removed; the MapLibre OSM-backed map and data layers are the sole renderer.
- Evidence: 25 test files and 96 tests pass, lint, build, and diff checks pass.
- Known limitation: browser visual QA remains blocked by the runtime failing before tab creation.

## Compact handoff: Flights OFF visibility
- Complete: the Flights tool now controls the complete aviation layer group: aircraft, HKIA facility, runways, terminals, and gates.
- Selection rule: turning Flights OFF clears selected aircraft and airport-context objects so the information panel cannot retain hidden data.
- Async rule: the same `airportLayersVisible` contract is applied during initial map load and later source updates.
- Evidence: `MapView.test.ts` covers the Flights visibility contract; full suite has 97 passing tests, lint/build/diff checks pass.
- Known limitation: browser interaction remains unverified because the runtime cannot create a tab.
