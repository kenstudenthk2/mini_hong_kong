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
Bus contract slice complete; live adapter and concrete output remain pending approval.

## Bus contract slice
- Source family: DATA.GOV.HK transport datasets, with operator ETA feeds as the future realtime overlay.
- Normalization cadence: define during adapter task; this slice contains no downloader or generated bus output.
- Staleness behavior: future UI must label the route feed stale when its source timestamp exceeds the configured freshness window.
- Schema: `BusRoutesSchema` in `src/dataSchemas.ts` validates route identity, operator, localized names, color, ordered stops, and geometry.
- Output file: none yet; a generated `public/data/bus-routes.json` requires a separate approved adapter/output task.
- Validation: `npm.cmd test -- src/dataSchemas.test.ts`
