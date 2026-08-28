# Hong Kong Open Data Notes

## Default Source
Use DATA.GOV.HK as the default authoritative source for Hong Kong public datasets:
https://data.gov.hk/en/

## Planned Transport Feeds
- Transport Department GTFS/headway data: static schedule backbone.
- MTR Next Train: future realtime heavy rail overlay.
- MTR Light Rail Next Train: future realtime Light Rail overlay.
- KMB/LWB ETA, Citybus ETA, NLB ETA, GMB ETA: future bus overlays.
- Sun Ferry ETA, HKKF ETA, Star Ferry timetables: future ferry layers.
- Hong Kong Tramways routes: future tram layer.
- Airport Authority Hong Kong flight information: historical/replay first unless a live source is verified.

## Verified Operator Contracts (2026-08-28)
- New Lantao Bus (NLB): the official DATA.GOV.HK dataset exposes route list, route-stop list, and estimated-arrival APIs through `rt.data.gov.hk/v2/transport/nlb/`; the route list uses `route.php?action=list`, while stops and ETA are parameterized by route and stop IDs.
- Green Minibus (GMB): the official Transport Department dataset exposes route, stop, route-stop, and ETA APIs through `data.etagmb.gov.hk`; the route-list contract is `https://data.etagmb.gov.hk/route/{region}` and ETA data is documented as updating every minute.
- Adapter boundary: NLB/GMB are verified as future operator feeds, not yet loaded by the app. Before implementation, validate stop-coordinate coverage, choose a bounded route/stop sample, record request concurrency, and define whether movement is ETA-driven or an explicitly labeled replay. Do not infer timetable headways from ETA responses.

## OpenStreetMap Geometry
- OSM API documentation: https://wiki.openstreetmap.org/wiki/API
- OSM developer documentation: https://wiki.openstreetmap.org/wiki/Develop
- Use OSM for static geographic geometry such as rail alignments, ferry approaches, tram corridors, station surroundings, and map-reference checks.
- Do not use the core OSM editing API as a bulk read-only geometry source. The OSM API page states it is for fetching/saving raw geodata for editing, and points read-only projects toward Overpass API or other data access APIs.
- Future ETL should prefer Overpass queries, extracts, or DATA.GOV.HK/GTFS geometry when available. Any automated OSM import/edit workflow is out of scope for this app unless separately approved and reviewed against OSM community import/automated-edit rules.

## Staleness Rule
Every future adapter must document its source URL, refresh cadence, generated output file, validation command, and how stale data appears in the UI.
