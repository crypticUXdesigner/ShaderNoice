# Bug reports (`docs/bug/`)

Investigated defects with repro, suspected layers, and key files. Use **`/write-bug`** (`.cursor/commands/write-bug.md`) or the **`document-bug`** skill to add entries.

| Status | Slug | Summary |
|--------|------|---------|
| Open | [midi-envelope-config-staleness](./midi-envelope-config-staleness.md) | Preset/remapper ADSR and range edits can leave frame cache stale; preview and live readouts lag until scrub/play/reload |
| Open | [param-driver-bypass-stacked-wire](./param-driver-bypass-stacked-wire.md) | Single port bypass toggle cannot pause both animation/MIDI base and graph wire when stacked |
| Open | [color-lut-connect-preview-freeze](./color-lut-connect-preview-freeze.md) | Connecting Color LUT / Color Gradient leaves “Updating preview…” then tab freeze; broken LUT emission + large inlined atlas + main-thread GPU compile |
