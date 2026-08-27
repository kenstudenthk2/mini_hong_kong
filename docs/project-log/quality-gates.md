# Quality Gates

## Required Before PR
- `npm.cmd test` — passed 2026-08-27 after review fixes, 13 tests.
- `npm.cmd run lint` — passed 2026-08-27 with no warnings.
- `npm.cmd run build` — passed 2026-08-27 with MapLibre chunk-size warning.
- Dev server smoke check — passed 2026-08-27; Vite served `/`, `/src/main.tsx`, `/data/rail-lines.json`, and `/data/trips-weekend.json` with HTTP 200.
- Desktop and mobile visual check for the map, directory menu, and controls — passed 2026-08-27 using Playwright screenshots.

## PR Controls
- Work must be committed on a feature branch — done on `feature/mini-hong-kong-mvp`.
- PR targets `main` — pending because no Git remote is configured.
- Code Reviewer reviews diff — completed; blocking findings fixed before final gates.
- Reality Checker verifies evidence — partially completed through command output and HTTP smoke; browser screenshot pending.
- Senior Project Manager confirms pass/fail state — conditional pass for local MVP scaffold.

## Senior PM Disposition
- Status: Conditional pass for local MVP scaffold.
- Conditions: Remote PR creation remains pending until a Git remote is available. Native MapLibre canvas visibility should be revisited in a full browser/WebGL environment; the MVP has a verified SVG schematic fallback.
