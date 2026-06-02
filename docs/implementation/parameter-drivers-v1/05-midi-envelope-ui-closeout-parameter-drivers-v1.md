# 05 — MIDI envelope UI + closeout — parameter-drivers-v1

## Agent instructions (START HERE)

Depends on **04**. Enable MIDI kind tab in panel (**01** stub). Follow user-goals **12** for layout parity with audio (left = track filter, main = envelope sections).

Package closeout: user-goals, README link, remove stale “Current” labels.

## Overview

**MIDI envelope** kind in **`ParameterDriverPanel`**: select arrangement **tracks** (left nav / section dividers), edit **envelope** (ADSR + output min/max) per binding, attach/detach to target param. Disabled state when **`arrangementSnapshot`** absent.

## Scope

### In

- Enable MIDI kind; gate UI + copy when no snapshot.
- Main column: sections per track (or grouped tracks) with envelope controls; create/select envelope preset for binding (inline edit OK for v1—no separate preset library required).
- Attach binding via **03** exclusivity (clears audio/animation on same param).
- Disconnect from panel header.
- Port chrome: third driven-state icon/cue for MIDI envelope.
- **`docs/user-goals/12-parameter-drivers.md`**: mark MIDI shipped; **`07-timeline-and-automation.md`** if timeline authoring note changed.
- **`docs/implementation/README.md`**: package row → Active/shipped when done.

### Out

- Polyphonic voice policy UI.
- DAW automation curve bindings (audiotool **05**).

## Dependencies

### Prerequisites

- **04** runtime + data model.

### Provides

- Full v1 parameter drivers package.

### Blocks

- —

## Implementation tasks

1. MIDI kind UI: track list from snapshot, envelope form, attach/detach.
2. Wire to **04** helpers; live preview on param during note hits (manual with imported arrangement test project).
3. Port + panel exclusivity with audio/animation.
4. Storybook or screenshot note for MIDI kind layout.
5. Final docs pass + **`_OVERVIEW.md`** 100% / all tasks ✅.

## Technical notes

- Track labels from snapshot metadata; handle empty note tracks gracefully.
- Velocity → peak: expose one slider if not automatic in **04**.

## Completion

✅ Done when MIDI envelope driver is attach/edit/remove from port, gated without snapshot, exclusivity holds, user-goals and implementation README updated, **`npm run verify:pages`** or project standard checks green.

### Final steps

- Mark **05** ✅; set **`_OVERVIEW.md`** overall to 100%.
