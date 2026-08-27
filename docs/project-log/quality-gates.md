# Quality Gates

## Required Before PR
- `npm.cmd test` — passed 2026-08-27 after review fixes, 13 tests.
- `npm.cmd run lint` — passed 2026-08-27 with no warnings.
- `npm.cmd run build` — passed 2026-08-27 with MapLibre chunk-size warning.
- Dev server smoke check — passed 2026-08-27; Vite served `/`, `/src/main.tsx`, `/data/rail-lines.json`, and `/data/trips-weekend.json` with HTTP 200.
- Desktop and mobile visual check for the map, directory menu, and controls — not completed because the integrated Pencil browser connector was unavailable.

## PR Controls
- Work must be committed on a feature branch.
- PR targets `main`.
- Code Reviewer reviews diff.
- Reality Checker verifies evidence.
- Senior Project Manager confirms pass/fail state.

## Senior PM Disposition
- Status: Conditional pass for local MVP scaffold.
- Conditions: Browser/WebGL visual verification and remote PR creation remain pending until a connected browser and Git remote are available.
