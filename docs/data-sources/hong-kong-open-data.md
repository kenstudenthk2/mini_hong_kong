# Hong Kong Open Data Notes

## Default Source
Use DATA.GOV.HK as the default authoritative source for Hong Kong public datasets:
https://data.gov.hk/en/

Portal stats (as of 2026-09-01): 5,700 datasets, 2,500 with API access,
120 data providers, 85B downloads in 2025.

## Active DATA.GOV.HK Dataset Catalog

Each dataset below is actively loaded by `src/hooks/useTransitData.ts` or an adapter
in `src/dataAdapters/`. The table records the source URL, API endpoint, refresh
cadence, adapter module, and staleness behavior.

### KMB / Long Win Bus (LWB)
- DATA.GOV.HK dataset: [Real time Arrival Data of Kowloon Motor Bus and Long Win Bus Services](https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb)
- Route API: `https://data.etabus.gov.hk/v1/transport/kmb/route/`
- Route-stop API: `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/`
- Stop API: `https://data.etabus.gov.hk/v1/transport/kmb/stop/`
- Route-level ETA: `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/1/1`
- Cadence: route/stop data updated daily; ETA updates every minute.
- Adapter: `src/dataAdapters/kmb.ts` — `normalizeKmbRoutes`, `normalizeKmbEta`.
- Staleness: ETA envelope timestamp retained as `busDataTimestamp`; UI shows
  `stale` when timestamp exceeds the one-minute freshness window.

### Citybus (CTB)
- DATA.GOV.HK dataset: Citybus route and ETA data via `rt.data.gov.hk/v2/transport/citybus/`.
- Route list: `https://rt.data.gov.hk/v2/transport/citybus/route/CTB`
- Route-stop: `https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/{route}/{direction}`
- Stop lookup: `https://rt.data.gov.hk/v2/transport/citybus/stop/{stopId}`
- Stop ETA: `https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/{stop}/{route}`
- Cadence: route/stop data updated daily; ETA updates every minute.
- Adapter: `src/dataAdapters/citybus.ts` — `normalizeCitybusRoutes`, `normalizeCitybusEta`.
- Request policy: 4 concurrent route-stop requests, 8 concurrent stop lookups.
- Staleness: Citybus feed timestamp not yet surfaced independently from KMB.

### New Lantao Bus (NLB)
- DATA.GOV.HK dataset: NLB route and ETA data via `rt.data.gov.hk/v2/transport/nlb/`.
- Route list: `https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list`
- Stop list: `https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=list&routeId={routeId}`
- ETA: `https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=estimatedArrivals&language=en&routeId={routeId}&stopId={stopId}`
- Cadence: route/stop data updated daily; ETA updates every minute.
- Adapter: `src/dataAdapters/nlb.ts` — `normalizeNlbRoutes`, `normalizeNlbEta`.
- Scope: four featured routes; six ETA stops on route 1.
- Request policy: 2 concurrent route-stop requests, 2 concurrent ETA requests.

### Green Minibus (GMB)
- DATA.GOV.HK dataset: Transport Department GMB route, stop, and ETA data via `data.etagmb.gov.hk`.
- Route list: `https://data.etagmb.gov.hk/route/{region}`
- Route-stop: `https://data.etagmb.gov.hk/route-stop/{region}/{route}/{direction}`
- Stop: `https://data.etagmb.gov.hk/stop/{stopId}`
- Stop ETA: `https://data.etagmb.gov.hk/eta/{route}/{direction}/{stopSequence}`
- Cadence: route/stop data updated daily; ETA updates every minute.
- Adapter: `src/dataAdapters/gmb.ts` — `loadGmbFeed`.
- Scope: HKI route 1, up to six stops per direction, concurrency-two requests.
- Staleness: individual ETA failures degrade to missing arrivals while retaining
  route geometry.

### Ferry Routes (GeoJSON)
- DATA.GOV.HK source: Transport Department routes-fares GeoJSON.
- URL: `https://static.data.gov.hk/td/routes-fares-geojson/JSON_FERRY.json`
- Cadence: static file, updated periodically by TD.
- Adapter: `src/dataAdapters/ferry.ts` — `normalizeFerryGeoJson`.

### Tram Routes (GeoJSON)
- DATA.GOV.HK source: Transport Department routes-fares GeoJSON.
- URL: `https://static.data.gov.hk/td/routes-fares-geojson/JSON_TRAM.json`
- Cadence: static file, updated periodically by TD.
- Adapter: `src/dataAdapters/tram.ts` — `normalizeTramGeoJson`.

### Ferry and Tram Schedules (GTFS headway)
- DATA.GOV.HK source: Transport Department public transport headway GTFS feed.
- URLs:
  - `https://static.data.gov.hk/td/pt-headway-en/routes.txt`
  - `https://static.data.gov.hk/td/pt-headway-en/trips.txt`
  - `https://static.data.gov.hk/td/pt-headway-en/stop_times.txt`
  - `https://static.data.gov.hk/td/pt-headway-en/calendar.txt`
- Cadence: static files, updated periodically by TD.
- Adapter: `src/dataAdapters/ferrySchedule.ts` — `normalizeFerryGtfsSchedules`,
  `normalizeTramGtfsSchedules`.

### Airport Flight Information (HKIA)
- DATA.GOV.HK dataset: Airport Authority Hong Kong flight information.
- Adapter: `src/dataAdapters/flight.ts` — `loadHkgFlights`.
- Policy: historical/replay first unless a live source is verified.

### Other Portal Resources
- City Dashboard: https://data.gov.hk/en/city-dashboard — traffic, environment,
  and sightseeing integrations; not directly consumed but noted as future
  reference for urban dashboard features.
- Open3Dhk: https://3d.map.gov.hk/ — 3D digital map visualization; potential
  future source for building height data.

## Seed Data (Local Files)

The rail MVP uses locally-validated seed data in `public/data/`:
- `rail-lines.json` — All 10 MTR heavy rail lines (Island, Tsuen Wan, Tuen Ma,
  East Rail, Kwun Tong, South Island, Tung Chung, Tseung Kwan O, Disneyland
  Resort, Airport Express) and all 12 Light Rail routes (505, 507, 610, 614,
  614P, 615, 615P, 705, 706, 751, 751P, 761P) with geometry and station IDs.
- `stations.json` — Station coordinates, localized names, and line associations.
- `trips-weekday.json` — Weekday schedule trips (headway-based simulation).
- `trips-weekend.json` — Weekend schedule trips.

Seed files are generated by `scripts/generate-rail-seed.py` (single source of
truth for line/station/trip definitions) and committed for offline use.

These files are validated by Zod schemas in `src/dataSchemas.ts` and cross-checked
by `assertValidTransitData` for referential integrity (line ↔ station ↔ trip).

## Transport Department GTFS Headway
- Transport Department GTFS/headway data: static schedule backbone for ferry and
  tram replay movement.

## Verified Operator Contracts (2026-08-28)
- New Lantao Bus (NLB): the official DATA.GOV.HK dataset exposes route list, route-stop list, and estimated-arrival APIs through `rt.data.gov.hk/v2/transport/nlb/`; the route list uses `route.php?action=list`, while stops and ETA are parameterized by route and stop IDs.
- Green Minibus (GMB): the official Transport Department dataset exposes route, stop, route-stop, and ETA APIs through `data.etagmb.gov.hk`; the route-list contract is `https://data.etagmb.gov.hk/route/{region}` and ETA data is documented as updating every minute.
- Adapter boundary: NLB and GMB route/stop geometry and bounded ETA samples are loaded as optional feeds. NLB uses four featured routes and six ETA stops on route 1; GMB uses HKI route 1, up to six stops per direction, and concurrency-two requests. ETA-driven movement is used only when adjacent predictions are available; no timetable headway is inferred from ETA responses.
- Current implementation: `src/dataAdapters/nlb.ts` and `src/dataAdapters/gmb.ts` normalize operator data; `src/hooks/useTransitData.ts` performs optional staged hydration. Individual GMB ETA failures degrade to missing arrivals while retaining route geometry.

## OpenStreetMap Geometry
- OSM API documentation: https://wiki.openstreetmap.org/wiki/API
- OSM developer documentation: https://wiki.openstreetmap.org/wiki/Develop
- Use OSM for static geographic geometry such as rail alignments, ferry approaches, tram corridors, station surroundings, and map-reference checks.
- Do not use the core OSM editing API as a bulk read-only geometry source. The OSM API page states it is for fetching/saving raw geodata for editing, and points read-only projects toward Overpass API or other data access APIs.
- Future ETL should prefer Overpass queries, extracts, or DATA.GOV.HK/GTFS geometry when available. Any automated OSM import/edit workflow is out of scope for this app unless separately approved and reviewed against OSM community import/automated-edit rules.

## Staleness Rule
Every future adapter must document its source URL, refresh cadence, generated output file, validation command, and how stale data appears in the UI.
