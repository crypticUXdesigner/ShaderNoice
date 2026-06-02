# 03 — Note Ripple Field — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02A.** Highest-priority first node. Use **`add-shader-node`** skill and **`_OVERVIEW.md`**.

## Overview

Ship **`note-ripple-field`** — recent note onsets launch **expanding circular ripples** from pitch-derived positions; velocity scales intensity. Validates onset window bake + preview loop.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `note-ripple-field` |
| `displayName` | `Note Ripple Field` |
| `category` | `Patterns` |
| `icon` | `wave-sine` or nearest ripple/water Phosphor icon |

**Ports:**

| Port | Type | Label | Default |
| --- | --- | --- | --- |
| `in` | vec2 | UV | — |
| `time` | float | Time | `uTimelineTime` |

**Outputs:**

| Port | Type | Label |
| --- | --- | --- |
| `out` | float | Value |
| `energy` | float | Energy |

**Parameters:**

| Param | Default | Range | Label |
| --- | --- | --- | --- |
| `windowSeconds` | 2.0 | 0.1–8 | Window |
| `speed` | 0.35 | 0.01–2 | Speed |
| `width` | 0.025 | 0.001–0.2 | Width |
| `feather` | 0.015 | 0–0.1 | Feather |
| `pitchSpread` | 0.42 | 0–1 | Spread |
| `centerX`, `centerY` | 0.5, 0.5 | 0–1 | Center X/Y (`coords`) |
| `trackFilterMode`, `trackFilterList` | (reuse) | — | via `arrangement-track-filter` layout |

**Shader (sketch):** For onsets in `[time - Window, time]` (max **512** loop): pitch class → angle; pitch norm → radius; `waveRadius = age * Speed`; ring mask + `exp(-age/Window) * velocity`; `out = max(rings)`, `energy = sum(local contrib)` capped.

**Files:** `src/shaders/nodes/note-ripple-field.ts`; `index.ts`; `node-documentation.json`; `FunctionGenerator` inject; `WgslMvpCompiler` case + allow-list.

**Tests:** `NodeShaderCompiler.test.ts` — compile with spike fixture + empty snapshot; assert bake constants + eval function name.

**Missing snapshot:** zero `out`/`energy`.

### Out

- Piano-roll layout; per-note rectangles.

## Dependencies

### Prerequisites

- **02A**

### Provides

- Reference pattern node; onset window path validated.

### Blocks

- **06B**, **07B**, **07D** (soft — can proceed in parallel after smoke, but prefer 03 merged first)

## Completion

✅ Done when node appears in **Patterns** palette, compiles WebGL + WebGPU with fixture snapshot, preview ripples track transport, tests green, **`npm run type-check && npm test && npm run build`**.

### Final steps

- Update `_OVERVIEW.md` row **03** → ✅ + date.
