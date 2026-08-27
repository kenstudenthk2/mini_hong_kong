# Project Agent Rules

## Before Writing Code
- Describe the approach and wait for approval before writing code unless the user has explicitly approved implementation.
- Ask clarifying questions when requirements are ambiguous and cannot be resolved from local context.

## Scope Control
- Split work that touches more than 3 files into small tasks with their own acceptance checks.
- Do not let any agent loop more than 3 times on the same failure. A 4th or 5th attempt needs Senior Project Manager approval and must be logged.
- After each task finishes, write a compact completion note and clear stale context so the next task starts with only necessary information.

## Context Control
- Give agents only the context pack and files required for their task.
- Senior Project Manager owns schedule, pass/fail gates, task split, and final quality control.
- Relevant agents vote on technical decisions; user instructions override all votes.

## Project Context
- Tech stack: React, TypeScript, Vite, Tailwind CSS, MapLibre GL, Zod, Vitest.
- App code lives in `src/`; validated seed data lives in `public/data/`; project trace logs live in `docs/project-log/`.
- Avoid unused scripts, broad rewrites, placeholder data flows, and direct pushes to `main`.

## Bug Fixing
- Start bug fixes with a failing test where feasible, then fix until the test passes.

## After Writing Code
- List what could break and the tests that cover it.
- Keep a PR branch and project logs so history can be traced.
