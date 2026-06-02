# 07C — Chord Voronoi Bloom — arrangement-pattern-nodes

## Agent instructions (START HERE)

Follow sections in order. **Depends on 02A** (active notes); **04** recommended for pitch-class palette. Use **`add-shader-node`** skill. Consider reusing Voronoi helpers from `src/shaders/uvWarp/` if applicable.

## Overview

Ship **`chord-voronoi-bloom`** — **active chord tones** as Voronoi sites; harmony **re-tessellates** the frame into glowing cells.

## Scope

### In

| Field | Value |
| --- | --- |
| `id` | `chord-voronoi-bloom` |
| `displayName` | `Chord Voronoi Bloom` |
| `category` | `Patterns` |

**Ports:** `in` UV, `time` → `uTimelineTime`, `seed` float default 0.

**Outputs:** `out` edge/fill mask; `color` vec4 nearest pitch-class color.

**Parameters:** `release` 0.25, `edgeWidth` 0.035, `siteJitter` 0.12, `fill` 0.4, `maxSites` 24, track filter.

**Shader:** Loop active notes at `time` with release max **maxSites**; site = pitch-class base + hash jitter; weighted distance by velocity; nearest/second-nearest → edge or fill mix.

**Performance:** Cap **24** sites; prefer active-note bin list from **02A** pre-filtered at compile or narrow time slice.

**Tests:** Compile; triad snapshot produces 3 dominant cells (manual or coarse assert).

### Out

- Full-screen O(notes) scan.

## Dependencies

### Prerequisites

- **02A**; **04** recommended

### Provides

- Harmonic topology node.

### Blocks

- **08** (partial)

## Completion

✅ Done when chord change visibly re-tessellates in demo, verify green.

### Final steps

- Update `_OVERVIEW.md` row **07C** → ✅ + date.
