# Failure Log

## 2026-08-27

### F-001: PowerShell npm shim blocked
- Task: Task 002 / local verification
- Command: `npm test`
- Result: Failed because `npm.ps1` is blocked by local PowerShell execution policy.
- Resolution: Use `npm.cmd` for all npm scripts. No system policy change made.
- Attempts:
  - 1: failed on PowerShell execution policy
  - 2: passed using `npm.cmd test`
- Approver for attempts 4-5: not needed
- Next action: Continue using `npm.cmd`.

### F-002: Initial build TypeScript errors
- Task: Task 003 / production build
- Command: `npm.cmd run build`
- Result: Failed on overly literal translation typing and Vite test config typing.
- Resolution: Broadened translation message type and imported `defineConfig` from `vitest/config`.
- Attempts:
  - 1: failed with TypeScript errors
  - 2: passed after patch
- Approver for attempts 4-5: not needed
- Next action: Watch for i18n type drift in future language additions.

### F-003: React Refresh lint warnings
- Task: Task 003 / lint verification
- Command: `npm.cmd run lint`
- Result: Passed with warnings because the i18n module exports provider, hook, and helper functions from one file.
- Resolution: Disabled the React Refresh component-only export rule for this project because the app does not depend on hot-module component boundaries for production correctness.
- Attempts:
  - 1: passed with warnings
  - 2: passed with no warnings
- Approver for attempts 4-5: not needed
- Next action: Keep hooks/components split if the i18n module grows.

### F-004: Integrated browser connector unavailable
- Task: Task 003 / visual smoke
- Command: Pencil browser load-page for `http://127.0.0.1:5173/`
- Result: Failed to connect to running Pencil app after 3 retries.
- Resolution: Performed HTTP smoke checks instead; visual/WebGL verification remains pending.
- Attempts:
  - 1: failed on unavailable connector
- Approver for attempts 4-5: not needed
- Next action: Run browser screenshot verification when Pencil or another browser connector is available.

### F-005: Blank MapLibre canvas in Playwright screenshot
- Task: Task 003 / visual smoke
- Command: Playwright screenshot at `http://127.0.0.1:5175/`
- Result: App data and menus rendered, but the map canvas area was visually blank.
- Resolution: Added a data-driven SVG schematic overlay that renders rail lines, stations, and clickable vehicle hotspots independently of external raster tile drawing.
- Attempts:
  - 1: screenshot showed blank map surface
  - 2: source update guard patched, screenshot still blank
  - 3: schematic overlay added, desktop and mobile screenshots passed
- Approver for attempts 4-5: not needed
- Next action: Keep MapLibre base enabled and revisit native layer visibility when a full browser/WebGL environment is available.

### F-006: Current Pencil browser connector unavailable
- Task: Current UI verification for transport switches and GMB hydration.
- Command: Pencil browser `load-page` for `http://127.0.0.1:5181/`.
- Result: Failed to connect to the running Pencil desktop app after three connector retries.
- Resolution: Stopped the temporary Vite server; retained automated and HTTP verification, with no browser visual claim.
- Attempts: 1 tool attempt containing 3 connector retries.
- Next action: Retry only after the integrated browser desktop connection is restored; do not add another browser harness package for this task.
