# 03 — Worker payload slim — arch-perf-remediation

## Agent instructions (START HERE)

Follow sections in order. Depends on **02** compile-contract location. Do not change incremental codegen semantics beyond what payload omission already documents.

## Overview

Reduce main-thread **`structuredClone`** cost when posting compile jobs: omit unused `previousResult` fields / skip clone when safe, and keep JSON fallback only as last resort. Preserve stale-id ignore and apply-on-rAF behavior.

## Scope

### In

- **`cloneableCompilePayload` / `CompilationManager.recompileExecute`:**
  - When `tryIncremental === false`, omit `previousResult` (confirm current code; harden if gaps).
  - When incremental: strip `previousResult` to fields `compileIncremental` actually reads (metadata.executionOrder, etc.) — document retained fields.
  - Prefer posting plain graph refs after ensuring no Proxies (Svelte `$state` may still require clone — measure; if clone mandatory, slim payload only).
- Tests in `workerMessages.test.ts` / `CompilationManager.test.ts` covering omit + strip.
- Short comment in `docs/architecture/compilation-worker.md` (or defer full prose to **08** with a one-line pointer).

### Out

- True partial emit (**deferred P3**).
- SharedArrayBuffer / transferable graph snapshots (future).

## Dependencies

### Prerequisites

- **02** (types live in compile-contract).

### Provides

- Cheaper compile kicks on edit.

### Blocks

- Nothing.

## Implementation tasks

1. Audit what `compileIncremental` and the worker read from `previousResult`.
2. Implement omit/strip in payload builder; keep `tryIncremental` flag coherent.
3. Add tests for clone size / field presence (assert keys absent).
4. Manual sanity: structure edit + parameter edit still compile in worker and main-thread paths.

## Technical notes

- Full compiles already may omit `previousResult` — verify `CompilationManager` paths for connection vs parameter kicks.
- Do not break `structuredClone` safety for Proxies — if graph is proxied, keep clone but of a **picked** plain object.

## Completion

✅ Done when non-incremental worker posts omit fat `previousResult`, incremental posts a documented subset, tests cover both, and compile still applies correctly.

### Final steps

- Mark task **03** ✅ in **`_OVERVIEW.md`**.
