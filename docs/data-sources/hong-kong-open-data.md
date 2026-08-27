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

## Staleness Rule
Every future adapter must document its source URL, refresh cadence, generated output file, validation command, and how stale data appears in the UI.
