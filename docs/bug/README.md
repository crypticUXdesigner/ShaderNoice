# Bug reports (`docs/bug/`)

Investigated defects with repro, suspected layers, and key files. Use **`/write-bug`** (`.cursor/commands/write-bug.md`) or the **`document-bug`** skill to add entries.

| Status | Slug | Summary |
|--------|------|---------|
| Open | [midi-envelope-config-staleness](./midi-envelope-config-staleness.md) | Preset/remapper ADSR and range edits can leave frame cache stale; preview and live readouts lag until scrub/play/reload |
| Fix proposed — needs verification | [audio-driver-bypass-shader-mismatch](./audio-driver-bypass-shader-mismatch.md) | Audio driver port bypass updates UI but preview keeps following audio until recompile |
| Open | [color-lut-connect-preview-freeze](./color-lut-connect-preview-freeze.md) | Connecting Color LUT / Color Gradient leaves “Updating preview…” then tab freeze; broken LUT emission + large inlined atlas + main-thread GPU compile |
| Mitigated (partial) | [arrangement-notes-blend-preview-freeze](./arrangement-notes-blend-preview-freeze.md) | Arrangement / pattern nodes + Blend — unwired WebGL codegen + WebGPU compile explosion fixed (2026-06-04); connected WebGL hot path remains |
| Open (product TBD) | [param-driver-bypass-stacked-wire](./param-driver-bypass-stacked-wire.md) | Port power toggle bypasses one driver layer only when animation/MIDI and graph wire stack on same float port |
