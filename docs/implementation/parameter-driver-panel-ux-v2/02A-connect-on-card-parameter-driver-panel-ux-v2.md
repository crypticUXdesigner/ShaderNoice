# 02A — Connect on card — parameter-driver-panel-ux-v2

## Agent instructions (START HERE)

Follow sections in order. Depends on **01** (use `DriverPresetCardShell` for header actions if landed; otherwise match its action order in existing cards).

**Product rule:** Connect always on the **asset** being attached, **`variant="primary"`**, when not already connected to the open parameter.

## Overview

Unify **Connect** for audio and MIDI overview: primary button on **RemapperCard** / **MidiEnvelopeCard**; remove duplicate **Connect** from `ParameterDriverPanel` overview toolbar for MIDI.

## Scope

### In

- **`RemapperCard.svelte`:** When `onConnect` is set, use **`variant="primary"`** (not ghost). Keep **Disconnect** as warning when connected to target.
- **`MidiEnvelopeCard.svelte`:** Ensure overview passes `onConnect` when preset can bind to open param (mirror `handleConnectPreset` logic).
- **`MidiDriverPanelContent.svelte`:** Pass `onConnect` / `onDisconnect` on the **selected** preset card (after **02B**, only one card visible).
- **`ParameterDriverPanel.svelte`:** Remove overview toolbar **Connect** for MIDI; keep **New envelope** (ghost/secondary) only.
- **`AudioDriverPanelContent.svelte`:** No toolbar Connect; remapper cards unchanged except variant (**RemapperCard**).
- Header action order on cards: **Connect | Disconnect | Duplicate (audio) | Delete** (right-aligned group).

### Out

- MIDI nav → single main editor (**02B**).
- Empty-state copy (**05**).
- Animation attach flow (still **Add animation driver** / **Edit curve**).

## Dependencies

### Prerequisites

- **01** (recommended for shell; not strictly blocking if cards updated in place).

### Provides

- Single connect path for audio/MIDI overview.

### Blocks

- **06** (docs must describe this pattern)

## Implementation tasks

1. Upgrade RemapperCard Connect to primary; verify click does not bubble to selection handler.
2. Wire `onConnect={() => handleConnectPreset(preset.id)}` on MIDI overview card(s); hide Connect when `isCurrentParam`.
3. Remove `canConnectMidiEnvelope` / toolbar Connect button from `ParameterDriverPanel`; keep selection state for nav if needed before **02B**.
4. Manual: open port overview → MIDI tab → Connect only on card → attaches and returns to focused (if `onDriverAttached` still pins overview false).
5. Run **`npm run type-check && npm test`**; update any tests asserting toolbar Connect.

## Technical notes

- `prepareGraphForMidiDriverAttach` / `connectMidiEnvelopePresetToParam` stay unchanged.
- User-goals currently say Connect on remapper card for audio—MIDI should match after this task (**06** updates both explicitly).

## Completion

✅ Done when MIDI overview has **no toolbar Connect**, both audio remappers and MIDI envelopes expose **primary Connect on the card**, and connected state shows **Disconnect** on the same card.

### Final steps

- Mark task **02A** ✅ in **`_OVERVIEW.md`**.
