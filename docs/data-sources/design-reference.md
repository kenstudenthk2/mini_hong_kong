# Design Reference: Mini Tokyo 3D

## Sources

| Reference | URL | Role |
|---|---|---|
| Live site | https://minitokyo3d.com/ | Visual/UX design reference (camera, palette, layers) |
| Source code copy | https://github.com/buntarou20050825-wq/minitokyo3dcopy | Technical reference — inspect the real implementation (layers, data flow, GTFS handling, worker architecture) |
| Original project | https://github.com/nagix/mini-tokyo-3d | Upstream author (Akihiko Kusanagi); the copy above is a mirror of this codebase |

- Creator: nagix (Akihiko Kusanagi)
- Map engine: Mapbox GL JS (this project uses MapLibre GL, the open-source fork)
- Attribution: © Mapbox, © OpenStreetMap contributors

## Technical Reference: Mini Tokyo 3D Stack (from the repo)

The `minitokyo3dcopy` repository contains the complete Mini Tokyo 3D source
(`mini-tokyo-3d-master/`, version 4.0.0-beta.1) plus EN/JA developer and user
guides. Relevant technical details for this project:

### Dependencies of note
- `mapbox-gl` ^3.9.3 — base map renderer.
- `@deck.gl/*` ^8.9.36 (core, geo-layers, layers, mapbox) — 3D layer rendering
  for trains/buildings; deck.gl layers are embedded into the Mapbox GL style.
- `three` ^0.172.0 — 3D scene helpers (models, animations).
- `@turf/*` ^5.1.5 (along, bearing, buffer, center-of-mass, clean-coords,
  destination, distance, line-intersect, line-slice, length, nearest-point-on-line,
  polygon-to-line, truncate, union) — geometry math for vehicle positioning,
  route geometry, and building footprints.
- `gtfs-realtime-bindings` ^1.1.1 — parses GTFS-RT (protocol buffer) transit
  feeds; the app's scheduled/replay model serves the same role without live GTFS-RT.
- `comlink` ^4.4.2 — Web Worker RPC; Mini Tokyo 3D moves GTFS parsing and data
  assembly off the main thread.
- `fflate`, `pbf`, `geobuf` — binary compression/decompression for tile and
  GeoJSON payloads.
- `suncalc` — day/night sky and lighting state.

### Architecture patterns worth copying
- **Deck.gl-over-Mapbox style composition**: Mini Tokyo 3D overlays deck.gl
  layer instances on the Mapbox GL style (the same pattern this project uses by
  attaching data-driven sources/layers to MapLibre).
- **Worker-based data assembly**: GTFS-RT parsing and vehicle-position synthesis
  run in a Web Worker via Comlink, keeping the UI thread free for rendering.
- **Turf-based geometry math**: vehicle coordinates are derived from route
  geometry with `@turf/along`/`nearest-point-on-line` rather than naive
  interpolation — a technique this project could adopt for curved segments.
- **Style-driven theming**: base style (OSM Liberty variant) is swapped for
  light/dark presentations without changing data sources.

### What Mini Tokyo 3D Provides as a Reference

Mini Tokyo 3D is a real-time 3D transit visualization of Tokyo. It renders the city
with extruded building footprints, moving train vehicles on rail geometry, and a
camera system that defaults to a pitched urban perspective. This project (Mini Hong
Kong) mirrors those design decisions:

### Design Elements Adopted

| Mini Tokyo 3D Feature       | Mini Hong Kong Implementation                          |
|-----------------------------|--------------------------------------------------------|
| Pitched 3D camera default   | `DEFAULT_MAP_VIEW` with `pitch: 60`, `zoom: 14`       |
| Extruded building layer     | `fill-extrusion` layer from OpenFreeMap vector tiles   |
| Light/dark basemap modes    | Two OSM raster layers switched by 2D/3D toggle           |
| Warm land/water palette     | `MINI_TOKYO_MAP_COLORS` constant in `MapView.tsx`       |
| Transit vehicle markers     | Circle + label layers with route color                  |
| Route highlight on selection| `route-focus` GeoJSON source with glow line             |
| Station markers with labels | `stations-circle` + `stations-label` layers             |
| Vehicle trail lines         | `vehicle-trails` layer showing traveled path             |

### Design Elements NOT Adopted

- Mini Tokyo 3D uses Mapbox GL JS (requires API key); this project uses MapLibre GL
  (no key required, fully open-source).
- Mini Tokyo 3D has a live data feed from Tokyo transit APIs; this project uses
  DATA.GOV.HK feeds with replay/simulation fallback.
- Mini Tokyo 3D has a timetable panel UI; this project uses a directory-style menu
  with an info panel.

## Palette Reference

The Mini Tokyo 3D color palette inspired the `MINI_TOKYO_MAP_COLORS` constant:

```
land:        #d8d2c6   (warm beige land tone)
water:       #8fb7d8   (soft blue water)
buildingLow: #f5d49a   (warm low-rise buildings)
buildingMid: #f08a5d   (mid-rise buildings)
buildingHigh:#8f5fbf   (high-rise buildings)
station:     #fff7e6   (warm white station dots)
label:       #fff7e6   (warm white labels)
labelHalo:   #1f2937   (dark label halo)
```

## Run Log References

- R-037: Default camera updated to Mong Kok station, pitch 60, bearing 0 — matching
  Mini Tokyo 3D's default camera style.
- R-038: Mini Tokyo 3D-inspired map color pass — warmed basemap, saturated building
  colors, warmer station/label styling.
- R-013: Compared live Mini Tokyo 3D and Mini Map Macau behavior; fixed route density
  to prioritize active vehicles over all routes at once.
