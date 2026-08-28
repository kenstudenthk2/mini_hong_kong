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
