# Mini Hong Kong Site Setup

## Project State
- Feature branch: `feature/mini-hong-kong-mvp`
- MVP: MTR + Light Rail schedule-driven simulation.
- Stack: TypeScript, React, Vite, MapLibre GL, Tailwind CSS, Zod, Vitest.
- Local reference only: `miniMacau.txt` is intentionally ignored and not committed because it is a large source brief.

## Agent Operating Rules
- Senior Project Manager controls pass/fail gates and retry limits.
- Agents read only their task packet and named files.
- Each task ends with a compact completion note in `docs/project-log/run-log.md`.
- Same failure max: 3 normal retries, 5 absolute with Senior PM approval.

## Quality Gates
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build`
- Dev server smoke check
- Desktop and mobile visual check
