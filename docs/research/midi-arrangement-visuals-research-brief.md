# Research Brief: Arrangement-Driven Shader Node Ideas (ShaderNoice)

## Your role

You are a **shader and procedural-pattern designer** who understands GLSL-style thinking (UV sampling, SDFs, smoothsteps, distance fields, masks). You do **not** have access to our codebase.

Your job is to propose **concrete new shader nodes** — same spirit as “Dot Grid”, “Stripes”, or “Radial Pulse” — that use **imported MIDI arrangement snapshot data** to produce **visual patterns and shapes** at each pixel.

We are **not** asking for:

- Product roadmaps, driver-panel UX, or “platform vision”
- Scene-switching / preset-morphing systems
- Parameter-driver architecture (ADSR envelopes, DAW automation bindings) — those are separate workstreams
- Another piano-roll or DAW timeline renderer (we already have those)

We **are** asking for:

- **Named node concepts** with **ports, parameters, and a per-pixel algorithm sketch**
- Ideas that output **patterns** (float masks, vec2 warps, vec4 color) from **`vec2` UV + `float` time**, driven by baked MIDI/arrangement data
- Enough detail that an engineer can judge **build vs skip** without further research

---

## Product context (minimal)

**ShaderNoice** is a browser-based **node-graph shader editor**. Users wire nodes together; the graph compiles to GLSL/WGSL and renders fullscreen. Music playback uses a shared transport time (`uTimelineTime`). Users may import a **one-shot arrangement snapshot** from an Audiotool published project.

**Complement, don’t duplicate:** Live **FFT audio** already handles moment-to-moment energy. Arrangement nodes should use **structure** (when notes happen, pitch, velocity, regions, track layout) to shape **space** (UV patterns), not replace spectrum bars.

---

## Arrangement snapshot — what data nodes may use

Static JSON, imported once, times in **seconds**. No live MIDI.

| Entity | Fields useful for visuals | Typical count |
|--------|---------------------------|---------------|
| **Note** | `startSeconds`, `durationSeconds`, `pitch` (0–127), `velocity` (0–1), `trackId` | 0–4000 (GPU bake cap **2048**) |
| **Region** | `startSeconds`, `durationSeconds`, `trackId`, `kind`, optional `colorIndex` | 20–180 (cap **512**) |
| **Track** | `id`, `kind` (note/audio/pattern), `orderAmongTracks`, optional `label`, `colorIndex` | 8–24 |
| **Global** | `bpm`, `durationSeconds`, `timeSignature` | 1 |

**v1 limits (must design within these):**

- Notes/regions are **baked at compile time** into shader constant arrays — not fetched from CPU per pixel.
- Per-pixel loops over notes are **budgeted** (~512 notes in the visible time window); heavy “scan all 2000 notes per pixel” designs are risky.
- Constant BPM only; loop repetitions inside note regions are **already expanded** in the note list.
- Node requires imported snapshot on playlist primary; otherwise compile error or zero output (pick one and state it).

---

## Already shipped — do NOT re-propose unless a clearly different algorithm

| Node | What it does | Why it’s not what we want more of |
|------|--------------|-----------------------------------|
| **Regions** | Colored rectangles = DAW region blocks per track row, scrolled by time | Literal timeline UI |
| **Notes** | Colored rectangles = MIDI notes (pitch vs time piano roll), optional `mask` output | Literal piano roll |

These prove snapshot baking works. We want **abstract pattern nodes** that *consume* the same data but **don’t look like a DAW**.

---

## Node model — follow this shape

Every idea must be specifiable like our existing pattern nodes.

### Reference: typical pattern node (no MIDI)

**Dot Grid** — `vec2` UV in → `float` out

- Inputs: `in` (vec2, UV)
- Outputs: `out` (float, dot mask 0–1)
- Params: Spacing, Dot Size, Feather, Intensity
- Algorithm: tile UV into cells, distance to cell center, smoothstep → dot mask

**Stripes** — `vec2` UV + optional `float` time → `float` out

- Params: Scale, Frequency, Amplitude, wave type, angle
- Algorithm: sine/square wave on rotated UV, optionally animated by time

**Radial Pulse** — `vec2` Position → `float` out

- Expanding ring wavefronts from center; spawn times can be driven externally
- Precedent for **event-triggered** spatial patterns (currently audio-driven, not MIDI)

### Reference: arrangement nodes (literal — avoid copying)

**Notes** — `vec2` UV + `float` time → `vec4` color + `float` mask

- Bakes note `{start, duration, pitch, velocity}` arrays; per-pixel loop finds notes near current time window

---

## What we want from you

Propose **12–20 new node concepts** that:

1. Take **`vec2` UV** (and usually **`float` time** wired to transport) as inputs
2. Output at least one of: **`float` mask**, **`vec2` warp/displacement**, **`vec4` color** — prefer **`float` mask** when in doubt (composable via Mix, Color LUT, etc.)
3. Read arrangement data **inside the shader** via baked arrays (you describe the bake + per-pixel logic)
4. Produce **recognizable visual patterns** — dots, rings, grids, rays, fields, halos, ripples, stripes, voronoi cells, contour lines — **modulated by MIDI structure**
5. Look good **fullscreen**, not only in a thin timeline strip

### Strong directions (seed prompts — go beyond these)

- **Note hits as spatial impulses** — each note within a time window creates a radial ripple, streak, or dot at a UV position derived from pitch (not from “piano roll layout”)
- **Pitch → angle or hue slot** — polar patterns where pitch class sets sector; time sets which sectors are “lit”
- **Density / rhythm fields** — smooth field from note count in a sliding time window, used to modulate stripe frequency or warp strength
- **Region boundaries as contour lines** — vertical (or radial) step functions when playhead crosses section spans; abstract, not colored blocks
- **Track-filtered layers** — same node, user selects drum track only → kick grid; melody track → sparse sparkles
- **Velocity → brightness/size** — within a pattern primitive, not within a rectangle note shape
- **Chord / pitch-class clustering** — notes active “now” (at `time`) define a small set of active bins → voronoi sites or palette indices

---

## Required fields per node idea

Use this template **for every proposal**. Incomplete specs will be discarded.

```markdown
### [Display Name] (`kebab-case-id`)

**One line:** What you see on screen in plain language.

**Category:** Patterns (always)

**Inputs:**
| Port | Type | Label | Default / fallback |
|------|------|-------|--------------------|
| in   | vec2 | UV    | —                  |
| time | float | Time | uTimelineTime      |
| …    |      |       |                    |

**Outputs:**
| Port | Type | Label | Meaning |
|------|------|-------|---------|
| out  | float | Value | 0–1 mask |
| …    |      |       |         |

**Parameters:** (short labels, ≤6 params for v1 preferred)
| Label | Type | Default | Role |
|-------|------|---------|------|
| …     |      |         |      |

**Snapshot data used:** notes / regions / tracks / bpm — be explicit.

**Bake (compile time):** What gets packed into arrays/textures (max counts, sorting, filtering).

**Per-pixel algorithm (pseudocode):** 10–25 lines. Include:
- How UV + time map to “which notes/regions matter”
- Loop bounds (critical for performance)
- Core distance / wave / field formula
- How pitch, velocity, duration affect the result

**Visual character:** 2–3 sentences — what it looks like when scrubbing vs playing.

**Composition example:** Wire chain in words, e.g. `Note Ripples (mask) → Mix (procedural background) → Color LUT → Output`.

**Feasibility:** S / M / L · Performance risk: low / med / high · Why.

**Musicality:** Why it feels synced to the song (not generic noise).

**Avoid:** What this is NOT (especially: not a piano roll).
```

---

## Algorithm constraints (feasibility)

Design for **WebGL2 + WebGPU** fragment shaders in a browser.

| Approach | Verdict |
|----------|---------|
| O(1) or O(k) per pixel, k ≤ 32 fixed | ✅ Preferred |
| O(n) over notes **only in a time window** pre-clamped to ≤512 | ⚠️ OK if loop is simple (distance + max) |
| O(all notes) every pixel | ❌ Reject |
| Pre-bin notes into a 2D grid/texture at compile time, sample once | ✅ Good |
| CPU per-frame note search uploaded as uniforms | ⚠️ Possible for small sets; state tradeoffs |
| Requires live MIDI stream | ❌ Reject |
| Requires tempo map / inner loop math | ❌ Reject |

When using time:

- **`time` input** = transport position in seconds (same as audio).
- “Notes active at time T” = `startSeconds ≤ T < startSeconds + durationSeconds` (or include release tail as param).
- “Notes in window `[T − W, T + W]`” = common pattern for local density.

When mapping pitch to space **without piano-roll literalism**:

- Pitch → angle: `(pitch - centerPitch) / range → [0,1] → * TAU`
- Pitch → radius: log scale or modular wrap
- Pitch class mod 12 → sector index
- **Do not** default to “Y = pitch, X = time” — that’s the existing Notes node

---

## Deliverable format

Single markdown report:

### 1. Summary table

| Rank | Display name | Output type | Primary data | Impact 1–5 | Feasibility 1–5 |
|------|--------------|-------------|--------------|------------|-----------------|

Include **at least 12 nodes**. Sort by Impact × Feasibility.

### 2. Full node specs

Top **8–10** nodes using the template above (complete pseudocode).

### 3. Short specs

Remaining nodes: abbreviated template (ports + 5-line algorithm + feasibility).

### 4. Rejected ideas (≥5)

Name + one sentence why it fails constraints (e.g. “piano roll heatmap — too literal”, “full song note graph per pixel — too slow”).

### 5. Top 3 build recommendations

Which nodes to implement first, **one paragraph each**, focused on shader logic — not UX roadmaps.

---

## Evaluation rubric

| Criterion | Weight |
|-----------|--------|
| Visual interest as a fullscreen pattern | 30% |
| Clear MIDI → UV/math mapping (not literal DAW UI) | 25% |
| GPU feasibility (bounded loops, bake-friendly) | 25% |
| Composability (float mask / warp into existing graph) | 10% |
| Parameter count / tuning burden (fewer is better) | 10% |

---

## Anti-patterns — do not propose

- Piano roll, timeline strip, or track-lane UI clones
- “Scene switcher” or crossfade between preset graphs
- MIDI envelope **parameter drivers** (no ports — different feature)
- ML, audio separation, or live hardware MIDI
- Nodes that only make sense when zoomed into a 32-second window (unless window is a param with fullscreen fallback)
- Vague “MIDI reactive energy” that duplicates FFT without using note timing/pitch

---

## Tone

- Write like a **technical art director** handing specs to a graphics programmer.
- Prefer **formulas and pseudocode** over adjectives.
- Every node should answer: **“At this UV and this transport time, which notes/regions contribute, and what shape do they draw?”**

---

## Success criteria

We will greenlight implementation if:

1. We can pick **2–3 nodes** from your top ranks and hand specs directly to engineering
2. Each spec has **ports, params, bake strategy, and bounded per-pixel pseudocode**
3. None of the top picks are literal DAW visualizations
4. A reader can sketch the expected frame at **t = 0:45** without opening our repo

---

**End of brief.** Begin with the summary table, then full specs. Ask clarifying questions only if blocked; otherwise state assumptions inline.
