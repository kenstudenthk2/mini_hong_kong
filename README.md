# Mini Hong Kong

Trilingual 3D visualization of Hong Kong public transport, modeled after Mini Macau,
Mini Taiwan, and Mini Tokyo 3D.

The first MVP implements a browser-local timetable simulation for MTR heavy rail
and Light Rail. Buses, ferries, trams, and HKG flights are documented as follow-up
data adapters and intentionally kept out of the first implementation slice.

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
