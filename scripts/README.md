# Scripts

Development and maintenance scripts for History Explorer.

## Purpose

The scripts directory holds development tools and automation used to build and maintain the project.

## Current Scripts

- **`freeze-check.mjs`** — M3.5 Freeze Guard. Automated protection for the
  Schema Freeze: scans for forbidden AI/LLM/graph/Redis tokens (after stripping
  comments and string literals), forbidden dependencies, `FROZEN_SCOPE=frontend`
  path violations, and the `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` enum
  invariant. Run locally with `node scripts/freeze-check.mjs`; wired into CI via
  `.github/workflows/ci.yml`. D-class violations fail the build.

## Future Responsibilities

- Data import scripts.
- Development tools.
- Additional automation scripts.
