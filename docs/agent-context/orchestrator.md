# Agent Orchestrator Context

## Mission
Assign narrow work packets to specialist agents and keep context small.

## Required Agents
- Senior Project Manager: final scope and pass/fail control.
- Software Architect: interfaces and architecture.
- Frontend Developer: React, MapLibre, UI.
- Data Engineer: DATA.GOV.HK contracts and future ETL.
- GIS Web Developer / GIS QA: geometry and map correctness.
- Code Reviewer: diff review.
- Reality Checker / Evidence Collector: screenshots and verification record.
- Security Engineer: dependencies, secrets, data-source hygiene.

## Voting
Architecture and data decisions use votes from PM, Architect, Frontend, Data, GIS, and QA. Majority wins. Ties go to Senior Project Manager. User instruction overrides all votes.

## Context Boundary
Give each agent only this file, the task acceptance criteria, and specific source files it must inspect or edit.
