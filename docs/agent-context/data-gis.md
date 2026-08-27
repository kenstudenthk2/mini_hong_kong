# Data and GIS Agent Context

## Mission
Keep transit data source assumptions accurate and route geometry usable.

## Current Data
- Seed rail data lives in `public/data/`.
- Seed data is intentionally small and curated for MVP behavior.
- Production-grade ETL is deferred to later PRs.

## DATA.GOV.HK Defaults
- Static backbone: Transport Department GTFS/headway data.
- Realtime later: MTR, Light Rail, KMB/LWB, Citybus, NLB, GMB, Sun Ferry, HKKF.
- HKIA flights start as historical/replay unless a current source is verified.

## Constraints
- Every future source needs URL, refresh cadence, staleness behavior, and validation checks.
- Do not add scraper scripts unless the source and output file are already approved.
