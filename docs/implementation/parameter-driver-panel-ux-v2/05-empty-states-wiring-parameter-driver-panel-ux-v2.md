# 05 — Empty states wiring — parameter-driver-panel-ux-v2

## Agent instructions (START HERE)

Follow sections in order. Depends on **01** (`DriverPanelEmptyState`).

Coordinate with **03** if touching `AudioDriverPanelContent` empty copy in the same PR.

## Overview

Wire shared **`DriverPanelEmptyState`** across all three driver kinds; add missing **primary CTAs** on audio empty states; align copy and hints with the connect-on-card model (**02A**).

## Scope

### In

- **`AudioDriverPanelContent`:** Replace inline `.empty-state` with `DriverPanelEmptyState`; primary **New band** when files exist (callback to shell `handleNewBand` or local duplicate); secondary copy for upload-audio-first when no files.
- **`MidiDriverPanelContent`:** Use shared empty for no presets / no filter match / focused-no-binding; keep **New envelope** primary where appropriate.
- **`AnimationDriverPanelContent`:** Migrate existing empty states to shared component (preserve **Add animation driver**, **Edit curve**, timeline hint).
- **Nav hints:** Shorten or remove duplicate hints in MIDI nav that repeat empty-state body text.
- **Focused MIDI** empty: optional primary **Browse** button (opens overview) in addition to copy.

### Out

- Layout/selection changes (**02B**, **03**).
- user-goals doc edits (**06**).

## Dependencies

### Prerequisites

- **01**.

### Provides

- Consistent empty UX across tabs.

### Blocks

- **06**

## Implementation tasks

1. Replace three implementations’ empty markup with `DriverPanelEmptyState`.
2. Audio: wire **New band** primary CTA (disabled when `!hasFiles` with tooltip).
3. Align `max-width` / `empty-hint` via component props (single default).
4. Manual walkthrough: open each tab with no assets—icon, title, one primary action each.
5. Run **`npm run type-check && npm run lint`**.

## Technical notes

- Shell toolbar **New band** may coexist with empty CTA—both OK if labels match; or empty CTA calls same handler via prop callback from `ParameterDriverPanel`.

## Completion

✅ Done when all driver-kind empty states use **`DriverPanelEmptyState`** and audio empty states include a **primary CTA** comparable to MIDI/animation.

### Final steps

- Mark task **05** ✅ in **`_OVERVIEW.md`**.
