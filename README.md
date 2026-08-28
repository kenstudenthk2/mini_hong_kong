# Mini Hong Kong

Trilingual 3D visualization of Hong Kong public transport, modeled after Mini Macau,
Mini Taiwan, and Mini Tokyo 3D.

The current MVP combines browser-local schedule simulation for MTR, Light Rail,
buses, ferries, and trams with a trilingual historical HKG flight board. HKIA is
represented with current AIP runway context and an explicitly labeled six-minute
runway movement replay; the app does not claim live aircraft telemetry or infer
en-route flight paths.

Data contracts and source decisions are recorded in
`ai/memory-bank/tasks/004-follow-up-data-adapters.md`. The interface uses a
directory-style menu with localized English, Traditional Chinese, and Portuguese
labels. MapLibre is the authoritative renderer for the OSM-backed basemap,
3D buildings, transit routes, vehicles, and movement trails; the legacy
schematic markup remains hidden as a recovery path.

## Stack

- React 19, TypeScript, Vite
- MapLibre GL for the 3D map
- Tailwind CSS v4 for styling
- Zod + Vitest for data and simulation checks

## Run

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm test
npm run lint
npm run build
```
