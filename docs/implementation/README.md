# Implementation specs

Focused engineering notes for behavior that is **partially implemented**, **not yet wired to UX**, or **easy to drift** across files. They complement **`docs/user-goals/`** (what users should get). Multi-step work lives here too: optional **`docs/implementation/<slug>/_OVERVIEW.md`** plus numbered task markdown files in the same folder (see **`workpkg-hygiene.mdc`**, **`define-project` / `define-tasks`** skills).

| Document | Topic |
|----------|--------|
| [graph-undo-redo.md](./graph-undo-redo.md) | Wire `UndoRedoManager` to keyboard/UI so undo/redo matches user goals |
| [`undo-history-gestures/_OVERVIEW.md`](./undo-history-gestures/_OVERVIEW.md) | **Active:** Gesture-level undo — one snapshot per completed knob/slider drag (`recordUndo` + bookmark), not per step |
| [node-panel-category-order.md](./node-panel-category-order.md) | Keep browse category order consistent between node panel and add picker |
| [a11y-baseline.md](./a11y-baseline.md) | Accessibility baseline / scripted checks |
| [node-port-labels-in-out-analysis.md](./node-port-labels-in-out-analysis.md) | Port labels: extended reference + audit tables (**canonical rules:** `shaders/node-standards.mdc` § port labels) |
| [`webgpu-migration/_OVERVIEW.md`](./webgpu-migration/_OVERVIEW.md) | **Historical:** WebGPU-first rollout tasks + ledger (**superseded** for policy — see [`docs/architecture/webgl-webgpu-preview-export.md`](../architecture/webgl-webgpu-preview-export.md)) |
| [`webgpu-heavy-nodes-followup/_OVERVIEW.md`](./webgpu-heavy-nodes-followup/_OVERVIEW.md) | **Active:** Task **10** remainder — `particle-system` GPU pass plan (compiler → preview → export → gates) + optional audio+RD export gate (**05**) |
| [`node-power/_OVERVIEW.md`](./node-power/_OVERVIEW.md) | Per-node Power (bypass) toggle: serialized node setting + two global compile rules + UI affordance |
| [`expression-node/_OVERVIEW.md`](./expression-node/_OVERVIEW.md) | **Expression** node: sandboxed math DSL (`a`–`d`), dual GLSL/WGSL emit, CodeMirror UI, demo preset |
| [`color-lut-gradient/_OVERVIEW.md`](./color-lut-gradient/_OVERVIEW.md) | **Done (2026-05-17):** **Color LUT** (preset 1D LUT + globals) and **Color Gradient** (3-stop spatial OKLCH × value mask, black at zero) |
| [`preview-compile-feedback/_OVERVIEW.md`](./preview-compile-feedback/_OVERVIEW.md) | Preview recompile **progress toast** coverage + **failed compile / last-good** clarity (bottom stack / info path) |
| [`audio-band-valueinput-ux/_OVERVIEW.md`](./audio-band-valueinput-ux/_OVERVIEW.md) | Audio band **`ValueInput`** fields: **vertical-intent** drag (ignore horizontal-dominant scrub), **Tab → inline edit**, modifier drag **regression** after drag changes |
| [`color-map-node-removal/_OVERVIEW.md`](./color-map-node-removal/_OVERVIEW.md) | **Remove `color-map` node:** migrate graphs on load, drop redundant float→grayscale stub from registry/WGSL, presets + docs closeout |
| [`runtime-editor-perf-phase2/_OVERVIEW.md`](./runtime-editor-perf-phase2/_OVERVIEW.md) | **Active:** Post–`/review-performance` residual — parameter `hashGraph` burst, lighter graph identity, preview-surface adjacency, canvas `$effect` audit, playing-path audio analyzer, DomNodeLayer DOM budget |
| [`webgpu-preview-gpu-scheduling/_OVERVIEW.md`](./webgpu-preview-gpu-scheduling/_OVERVIEW.md) | **Active:** WebGPU preview **GPU path & scheduling** — instrumentation, clock-mask hardening, uniform upload audit, editor view-sync backoff when fullscreen, pipeline LRU docs |
| [`graph-runtime-ui-seams/_OVERVIEW.md`](./graph-runtime-ui-seams/_OVERVIEW.md) | **Done (2026-05-14):** Graph / runtime / UI **seam hardening** — preview-compile UI sink, canvas parameter sync, `App` runtime bootstrap extract, WebGPU paste/add guards, worker message contract tests |
| [`graph-runtime-ui-architecture-followup/_OVERVIEW.md`](./graph-runtime-ui-architecture-followup/_OVERVIEW.md) | **Active:** Post–`/review-architecture` follow-up — `App` orchestration shrink, render-backend façade, WebGPU/compile modularization, graph-diff ownership doc, runtime-only guardrails, `graphStore`↔toast decoupling, WebGPU wire validation phase 2, `lib`→`ui` barrel audit |
| [`audiotool-arrangement/_OVERVIEW.md`](./audiotool-arrangement/_OVERVIEW.md) | **Active:** Audiotool **published-project snapshot** — foundation shipped (import + persist on `audioSetup`); region/note nodes + DAW automation bindings next |
| [`transform-2d-unify/_OVERVIEW.md`](./transform-2d-unify/_OVERVIEW.md) | **Active:** Unify **Rotate**, **Scale**, **Flip** into **`transform`** (fixed order Flip→Scale→Rotate, shared pivot); **`displace`** unchanged; load migration for legacy types |
| [`audio-incremental-analysis/_OVERVIEW.md`](./audio-incremental-analysis/_OVERVIEW.md) | **Active:** Incremental offline audio curves — Tier A remapper patch (no toast), Tier B band rebuild, per-file invalidation; skip redundant compile on remapper-only edits |
| [`distortion-expansion-v1/_OVERVIEW.md`](./distortion-expansion-v1/_OVERVIEW.md) | **Active:** Five **Distort** UV nodes — Crease Fold, Cellular Slip, Möbius Portal, Wake Smear, Circle Inversion (shared Voronoi/inversion helpers + WebGPU MVP) |
| [`parameter-drivers-v1/_OVERVIEW.md`](./parameter-drivers-v1/_OVERVIEW.md) | **Done (2026-06-01):** Unified **parameter driver panel** (audio, animation, MIDI) + milestone C UX (disconnect/delete, focused header, MIDI preset sharing, Browse/overview polish); see **`docs/user-goals/12-parameter-drivers.md`** |
| [`parameter-driver-panel-ux-v2/_OVERVIEW.md`](./parameter-driver-panel-ux-v2/_OVERVIEW.md) | **Done (2026-06-02):** Post–v1 panel UX — connect-on-card, MIDI single-editor overview, audio one-band layout + analysis collapse, shared empty states + Targets parity; **`docs/user-goals/12-parameter-drivers.md`** |
| [`parameter-driver-bypass-on-node/_OVERVIEW.md`](./parameter-driver-bypass-on-node/_OVERVIEW.md) | **Active:** Driver bypass **power toggle on node** (above port; audio + animation + MIDI + graph wire); remove panel duplicate; bug doc for stacked driver + wire |
| [`arrangement-pattern-nodes/_OVERVIEW.md`](./arrangement-pattern-nodes/_OVERVIEW.md) | **Done (2026-05-30):** Ten **Patterns** nodes driven by arrangement snapshot — ripples, compass, stripes, Voronoi, warps (complement **Notes** / **Regions**); demos `note-ripple-field-demo`, `arrangement-patterns-showcase` |
| [`sticky-notes-v1/_OVERVIEW.md`](./sticky-notes-v1/_OVERVIEW.md) | **Active:** Canvas **Stickies** — graph-level annotations, optional node attachment, show/hide toggle; foundation for future visual groups |
| [`node-category-contrast-v1/_OVERVIEW.md`](./node-category-contrast-v1/_OVERVIEW.md) | **Active:** Node editor **category contrast** — audit script + token fixes (headers, knobs, labels, connected states, toggles, embeds); regression-safe tiers |
| [`midi-envelope-adsr-curves-v1/_OVERVIEW.md`](./midi-envelope-adsr-curves-v1/_OVERVIEW.md) | **Done (2026-06-01):** MIDI envelope **ADSR curve presets** — per-phase linear/exponential/logarithmic/smooth easing, shared runtime helper, editor SVG + ms labels |
| [`midi-envelope-remappers-v1/_OVERVIEW.md`](./midi-envelope-remappers-v1/_OVERVIEW.md) | **Done (2026-06-02):** MIDI **envelope preset + target ranges** (audio band/remapper parity) — `outMin`/`outMax` on remappers; bindings use `remapperId`; preset-level frame-cache eval; **`docs/user-goals/12-parameter-drivers.md`** |
| [`midi-envelope-retrigger-policy-v1/_OVERVIEW.md`](./midi-envelope-retrigger-policy-v1/_OVERVIEW.md) | **Active:** Configurable MIDI envelope **retrigger policy** — default last-note-wins; optional hold-if-higher (and optional legato) for overlapping notes / long release |

New multi-step packages: add `docs/implementation/<slug>/_OVERVIEW.md` first, then link it here (see **`workpkg-hygiene.mdc`**).

When a spec is fully delivered, update or archive it and align **`docs/user-goals/`** if behavior changed.
