# 01 — Hygiene + cheap frame CPU — arch-perf-remediation

## Agent instructions (START HERE)

Follow sections in order. Prefer small, testable diffs. Do **not** change WebGPU pass-plan structure or compile-contract ownership here (02 / 04*).

Respect **`_OVERVIEW.md`**: immutable graph; no product UX changes.

## Overview

Delete dead change-detection duplication and land low-risk per-frame CPU wins: cache uniform names, index audio connection/band lookups, and avoid redundant audio status store writes.

## Scope

### In

- Delete or quarantine **`src/utils/graphComparison.ts`** (no production imports — verify with grep; remove tests that only exercise it if any).
- **`src/runtime/utils.ts` `getUniformName`:** cache `nodeId+paramName → name` (module Map or `ShaderInstance`-owned map); keep sanitization semantics identical.
- **`FrequencyAnalyzer`:** replace per-frame `graph.connections.find` with a revision-keyed index (`targetNodeId+port → source`).
- **`audioUniformUpdates` / remappers:** `bandId → band` Map built when `audioSetup` revision changes (not `.find` each band).
- **`AudioManager.updateUniforms`:** write `audioAnalysisStatusStore` only when status string/state actually changes.
- Colocated unit tests for cache hit behavior and index correctness.

### Out

- WebGPU clock (`05`), export `finish` (`06`), compile-contract (`02`), pass executor (`04*`).

## Dependencies

### Prerequisites

- **`arch-perf-remediation/_OVERVIEW.md`**

### Provides

- Hot-path micro-wins usable immediately; cleaner utils surface for **08**.

### Blocks

- Nothing hard; **08** may reference deleted `graphComparison`.

## Implementation tasks

1. Confirm zero production imports of `graphComparison`; delete file (+ any dead tests).
2. Add uniform-name cache; assert identical names vs previous `getUniformName` in tests.
3. Add connection index for frequency analysis; same outputs as `.find` path.
4. Band Map for remappers; gate status store updates.
5. Run `npm run type-check` and targeted Vitest.

## Technical notes

- Cache keys must include full `nodeId` and `paramName` (sanitization is lossy — do not key on sanitized form alone if collisions matter; key on raw pair, store sanitized result).
- Graph revision: reuse existing compile-identity / graph ref identity if available; otherwise rebuild index when `graph !== lastGraph`.

## Completion

✅ Done when `graphComparison` is gone, uniform/index/status changes are tested, behavior matches prior lookups, and `npm run type-check && npm test` (affected suites) pass.

### Final steps

- Mark task **01** ✅ in **`_OVERVIEW.md`**.
