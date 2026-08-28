# Decision Log

## 2026-08-27

### D-001: App language
- Decision: Use TypeScript for the app and Python only for future ETL.
- Votes: Senior PM pass, Architect pass, Frontend pass, Data pass, QA pass.
- Reason: React/Vite/MapLibre patterns match Mini Macau, Mini Taiwan, and Mini Tokyo-style browser simulation.

### D-002: MVP scope
- Decision: Ship MTR + Light Rail first; keep buses, ferries, trams, and HKG flights as follow-up PRs.
- Votes: Senior PM pass, Architect pass, Frontend pass, Data pass, GIS pass, QA pass.
- Reason: Full Hong Kong coverage is too large for one reliable implementation slice.

### D-003: Agent context isolation
- Decision: Store small context packs in `docs/agent-context/` and avoid asking agents to read the whole repo by default.
- Votes: Senior PM pass, Orchestrator pass, Architect pass, QA pass.
- Reason: The source brief is very large and agent work needs narrow, traceable context.

### D-004: Task completion compaction
- Decision: Every task completion must leave a compact note and clear stale context before the next task begins.
- Votes: User override, Senior PM pass.
- Reason: Long multi-agent work needs traceable handoffs without accumulating unnecessary context.

### D-005: OpenStreetMap API usage
- Decision: Treat OSM as a geometry reference source, but do not use the core OSM editing API for bulk read-only ETL.
- Votes: Data Engineer pass, GIS pass, Architect pass.
- Reason: The OSM API documentation identifies the API as editing-oriented and recommends read-only alternatives such as Overpass API for this type of use.

### D-006: Schematic overlay for visual resilience
- Decision: Render a lightweight SVG rail schematic above MapLibre using the same line, station, and vehicle data.
- Votes: Frontend pass, GIS pass, QA pass, Senior PM pass.
- Reason: Playwright visual verification showed the MapLibre canvas could be visually blank in this environment while app data loaded; the overlay keeps the MVP inspectable without replacing MapLibre as the base map.

### D-007: MapLibre-only renderer supersedes D-006
- Decision: Remove the SVG schematic renderer after route geometry, layer controls, and MapLibre source updates were verified; MapLibre is the sole renderer.
- Votes: Frontend pass, GIS pass, QA pass, Senior PM pass.
- Reason: The schematic was a duplicate top layer and could diverge from the geographic map. Transport visibility and route focus now use MapLibre sources directly.
- Verification boundary: browser/WebGL interaction is still pending; automated tests, lint, build, and diff checks are the available evidence.
