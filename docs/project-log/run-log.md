# Run Log

## 2026-08-27

### R-001: Planning and reference review
- Inputs: `miniMacau.txt`, Mini Taiwan, Mini Tokyo 3D, DATA.GOV.HK.
- Result: Approved MVP plan for Mini Hong Kong with MTR + Light Rail first.

### R-002: Selective agency agent install
- Source: `https://github.com/jnMetaCode/agency-agents-zh`
- Installed locally: `.codex/agents/`
- Selected only project-relevant agents for PM, orchestration, architecture, frontend, data, GIS, review, QA, and security.

### R-003: Initial implementation
- Created Vite/React/TypeScript scaffold, seed data, simulation engine, MapLibre app shell, directory menu, tests, and docs.
- Verification so far: `npm.cmd test` passed with 9 tests.

### R-004: User rule update
- Added AGENTS.md rule requiring a compact completion note and stale-context clearing after each task.

### R-005: Senior PM review response
- Added `ai/memory-bank/site-setup.md`, task packets, PR template, richer failure records, and explicit gate evidence.
- Moved active work to `feature/mini-hong-kong-mvp`.

### R-006: Code review response
- Fixed operational-day schedule handling, weekend trips, station-to-station geometry interpolation, MapLibre lifecycle stability, paused-clock updates, cross-file data validation, and Portuguese station labels.
- Verification after fixes: `npm.cmd test` passed 13 tests; `npm.cmd run build` passed.

### R-007: Final local verification
- `npm.cmd test`: passed, 13 tests.
- `npm.cmd run lint`: passed with no warnings.
- `npm.cmd run build`: passed with MapLibre chunk-size warning.
- Vite dev server: running at `http://127.0.0.1:5173/`.
- HTTP smoke: `/`, `/src/main.tsx`, `/data/rail-lines.json`, and `/data/trips-weekend.json` returned 200.
- Browser visual: not completed because Pencil browser connector was unavailable.

### R-008: Git record status
- Branch: `feature/mini-hong-kong-mvp`
- Commit: `2f82255 feat: scaffold mini hong kong mvp`
- Remote: none configured, so push and PR creation are pending external repository setup.

### R-009: OSM source update
- Added OpenStreetMap API and Develop documentation links to the Hong Kong data-source notes.
- Clarified that future geometry ETL should use read-oriented OSM paths such as Overpass/extracts, not the core editing API.

### R-010: Visual verification
- Browser path: Pencil connector unavailable, so Playwright CLI was used.
- Screenshots: desktop `C:\Users\02007572\AppData\Local\Temp\mini-hk-desktop-verified.png`; mobile `C:\Users\02007572\AppData\Local\Temp\mini-hk-mobile-verified.png`.
- Result: Desktop and mobile passed after adding the SVG schematic overlay.
- Verified visible elements: directory menu, Rail/Light Rail sections, planned future transport sections, controls, route lines, station markers, and moving vehicle hotspots.
