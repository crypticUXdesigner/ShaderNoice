# 02A — Audio driver panel layout — parameter-drivers-v1

## Agent instructions (START HERE)

Depends on **01**. Follow sections in order. Preserve remapper connect/disconnect semantics and virtual-node connection model.

Do **not** implement animation lane creation (**02B**) or driver mutual exclusivity enforcement (**03**) beyond what existing connect already does.

## Overview

Move **audio driver** configuration into the unified panel **main column**: bands appear as **section dividers** with remappers and band settings below each section. **Left column** is filter/navigation only (band list, search, “all bands”)—not a second full config sidebar.

## Scope

### In

- Refactor **`AudioSignalPickerLargeContent`** (or successor) into driver panel **Audio** kind slot:
  - Left: band filter / highlight / scroll-to-section.
  - Main: stacked sections per band (header divider + remappers list + create remapper + inline remapper **`ValueInput`** fields).
- **Connect remapper** to target param from main column; **disconnect** from panel header or remapper row.
- **Compact “already connected”** flow: same panel with remapper section scrolled/focused—avoid separate **`AudioSignalPickerCompact`** popover as long-term UX (may thin-wrap during migration).
- Jump-to-driven-parameter list item behavior preserved (pan/zoom canvas, panel stays open).
- Audio panel browse mode (bottom bar toggle) **unchanged**—still create/edit bands without target param.

### Out

- Animation kind content (**02B**).
- Driver kind exclusivity when switching kinds (**03**).
- Incremental analysis / compile fingerprint changes.

## Dependencies

### Prerequisites

- **01** driver panel shell.

### Provides

- Target audio UX from **`12-parameter-drivers.md`**.

### Blocks

- **03** (polish) should follow **02A** + **02B**.

## Implementation tasks

1. Implement main-column **band sections** component; wire remapper CRUD to existing `audioSetup` commit paths.
2. Wire left nav to scroll/filter sections; verify narrow width (~band names only).
3. Connect/disconnect remapper updates graph connection to virtual node; preview reacts live.
4. Remove or redirect legacy **large-only** picker entry so port path always uses unified panel.
5. Update **`AudioSignalPicker*.stories.ts`** or add driver panel stories for Audio kind.
6. Manual: attach remapper from port, edit inMin/outMax, disconnect; layout readable at default floating panel width.

## Technical notes

- Reuse **`getNamedSignalsFromAudioSetup`**, existing remapper ids, migration-safe connect helpers.
- Peak meter on param row stays in **`ParamPortWithAudioState`**—no duplicate in panel required.

## Completion

✅ Done when audio driver attach/edit/remove works entirely inside **ParameterDriverPanel** with target layout (left filter, main divided sections), audio browse panel still works, and **`npm test`** + build pass.

### Final steps

- Mark **02A** ✅ in **`_OVERVIEW.md`**.
