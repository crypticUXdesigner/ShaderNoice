# 06C — Track Halo Lattice — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02B** (track energy bins). Use **`add-shader-node`** skill.

## Overview

Ship **`track-halo-lattice`** — each **track** owns an offset **lattice layer**; per-track energy from bins makes halos glow. Shader loops **tracks (≤16)**, not notes.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `track-halo-lattice` |
| `displayName` | `Track Halo Lattice` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`.

**Outputs:** `out` combined lattice mask; `trackMask` float dominant track 0–1.

**Parameters:** `latticeScale` 7, `haloSize` 0.18, `decay` 0.8, `trackSpread` 0.27, `contrast` 1.4, `maxTracks` 16, track filter.

**Shader:** For each track up to `maxTracks`: sample track energy bin at `time` with decay; golden-angle offset by track index + pitch mean; fract lattice distance → halo; `trackMask` from strongest energy.

**Performance:** O(tracks) ≤ 16 per pixel.

**Tests:** Compile; multi-track fixture shows layered halos.

### Out

- Horizontal track lanes.

## Dependencies

### Prerequisites

- **02B**

### Provides

- Per-track abstract layering.

### Blocks

- **08** (partial)

## Completion

✅ Done when multi-track demo shows distinct layers, verify green.

### Final steps

- Update `_OVERVIEW.md` row **06C** → ✅ + date.
