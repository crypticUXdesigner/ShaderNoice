# 03 — Bug doc — stacked driver + graph wire — parameter-driver-bypass-on-node

## Agent instructions (START HERE)

Follow sections in order. Use **`/write-bug`** / **`document-bug`** discipline (self-contained for external readers). This task is **documentation only**—no product fix for stacking in v1.

May run **in parallel** with **01** / **02A** / **02B**.

## Overview

Author an open bug report for the **single bypass toggle** ambiguity when a parameter is influenced by both a **primary driver** (animation base and/or MIDI) **and** an active **graph wire** with input modes. Product and engineering agree this combination is rare today but undefined for bypass.

## Scope

### In

- New file: **`docs/bug/param-driver-bypass-stacked-wire.md`** (slug flexible if clearer)
- Update **`docs/bug/README.md`** index row
- Cross-link from **`parameter-driver-bypass-on-node/_OVERVIEW.md`** Notes (one line—done as part of Final steps here)
- Document:
  - **Symptom / gap:** One node power toggle only targets one bypass store (connection vs lane vs binding per precedence); animation base can remain active while a graph wire is bypassed, or vice versa, depending on stack
  - **Current behavior:** How effective values combine today (`parameterValueCalculator`, input modes, animation as base)
  - **Expected (TBD):** Options for product (single toggle pauses all layers vs per-layer bypass)—no decision required
  - **Repro sketch:** Minimal graph description (float param with evaluable lane + noise→param wire in multiply/add mode)
  - **Key files** with one-line roles
  - **Status:** Open

### Out

- Implementing multi-layer bypass
- Changing driver exclusivity rules

## Dependencies

### Prerequisites

- Investigation from parameter-driver-bypass design (this conversation + code read of `resolveDriverKindForParam`, `parameterValueCalculator`).

### Provides

- Tracked known issue for future UX/product pass.

### Blocks

- None.

## Implementation tasks

1. Draft bug doc with mandatory sections per **`write-bug.md`** (symptom, key files, expected vs actual, self-contained repro).
2. Add README index entry.
3. Link from **`_OVERVIEW.md`** Notes → bug slug.

## Technical notes

- **`parameter-drivers-v1` task 03** preserved graph wires when attaching animation—intentional; cite `parameterDriverAttach.ts` if helpful.
- State explicitly: v1 ship **documents** the gap; node toggle follows connection-first precedence.

## Completion

✅ Done when bug doc is indexed, self-contained, and linked from the work-package overview.

### Final steps

- Mark task **03** ✅ in **`_OVERVIEW.md`**.
