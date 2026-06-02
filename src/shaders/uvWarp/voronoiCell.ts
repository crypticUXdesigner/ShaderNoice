import type { Vec2 } from './circleInversion';

/** Result of a 3×3 Voronoi neighborhood search (Euclidean metric). */
export type VoronoiCellLookup = {
  cellId: [number, number];
  seed: [number, number];
  f1: number;
  f2: number;
  cellHash: number;
};

const VORONOI_INITIAL = 8;

function fract(x: number): number {
  return x - Math.floor(x);
}

function voronoiRandom2(cell: Vec2): [number, number] {
  return [
    fract(Math.sin(cell[0] * 127.1 + cell[1] * 311.7) * 43758.5453),
    fract(Math.sin(cell[0] * 269.5 + cell[1] * 183.3) * 43758.5453),
  ];
}

/**
 * Stable per-cell hash in `[0, 1]²` for motion offsets (Cellular Slip and similar).
 * Matches the jitter seed hash used in **Cells** (`voronoi-noise.ts`).
 */
export function hashCell(cellId: Vec2): [number, number] {
  return voronoiRandom2(cellId);
}

function hash21(cellId: Vec2): number {
  return fract(Math.sin(cellId[0] * 127.1 + cellId[1] * 311.7) * 43758.5453);
}

/**
 * 3×3 Voronoi lookup in scaled domain space.
 * Returns winning cell id, seed position, F1/F2 distances, and a cell hash seed.
 *
 * @see `src/shaders/nodes/voronoi-noise.ts` — duplicate candidate for future dedupe.
 */
export function voronoiCellLookup(p: Vec2, scale: number, jitter: number): VoronoiCellLookup {
  const safeScale = Math.max(scale, 0.001);
  const domainX = p[0] * safeScale;
  const domainY = p[1] * safeScale;
  const iX = Math.floor(domainX);
  const iY = Math.floor(domainY);

  let f1 = VORONOI_INITIAL;
  let f2 = VORONOI_INITIAL;
  let cellId: [number, number] = [0, 0];
  let seed: [number, number] = [0, 0];

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const cell: [number, number] = [iX + x, iY + y];
      const point = voronoiRandom2(cell);
      const seedX = iX + x + point[0] * jitter;
      const seedY = iY + y + point[1] * jitter;
      const diffX = seedX - domainX;
      const diffY = seedY - domainY;
      const dist = Math.hypot(diffX, diffY);

      if (dist < f1) {
        f2 = f1;
        f1 = dist;
        cellId = cell;
        seed = [seedX / safeScale, seedY / safeScale];
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }

  return {
    cellId,
    seed,
    f1,
    f2,
    cellHash: hash21(cellId),
  };
}

export function emitVoronoiCellGlsl(): string {
  return `
// 3×3 Voronoi neighborhood — see src/shaders/nodes/voronoi-noise.ts (Cells) for dedupe candidate.
struct UvWarpVoronoiCell {
  vec2 cellId;
  vec2 seed;
  float f1;
  float f2;
  float cellHash;
};

vec2 uvWarp_voronoiRandom2(vec2 cellId) {
  return fract(
    sin(vec2(
      dot(cellId, vec2(127.1, 311.7)),
      dot(cellId, vec2(269.5, 183.3))
    )) * 43758.5453
  );
}

float uvWarp_voronoiHash21(vec2 cellId) {
  return fract(sin(dot(cellId, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 uvWarp_hashCell(vec2 cellId) {
  return uvWarp_voronoiRandom2(cellId);
}

UvWarpVoronoiCell uvWarp_voronoiCellLookup(vec2 p, float scale, float jitter) {
  float safeScale = max(scale, 0.001);
  vec2 domain = p * safeScale;
  vec2 i = floor(domain);
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 cellId = vec2(0.0);
  vec2 seed = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cell = i + neighbor;
      vec2 point = uvWarp_voronoiRandom2(cell) * jitter;
      vec2 seedPos = i + neighbor + point;
      vec2 diff = seedPos - domain;
      float dist = length(diff);
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
        cellId = cell;
        seed = seedPos / safeScale;
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }

  UvWarpVoronoiCell result;
  result.cellId = cellId;
  result.seed = seed;
  result.f1 = f1;
  result.f2 = f2;
  result.cellHash = uvWarp_voronoiHash21(cellId);
  return result;
}
`.trim();
}

export function emitVoronoiCellWgsl(): string {
  return `
struct UvWarpVoronoiCell {
  cellId: vec2<f32>,
  seed: vec2<f32>,
  f1: f32,
  f2: f32,
  cellHash: f32,
}

fn uvWarp_voronoiRandom2(cellId: vec2<f32>) -> vec2<f32> {
  return fract(sin(vec2<f32>(
    dot(cellId, vec2<f32>(127.1, 311.7)),
    dot(cellId, vec2<f32>(269.5, 183.3))
  )) * 43758.5453);
}

fn uvWarp_voronoiHash21(cellId: vec2<f32>) -> f32 {
  return fract(sin(dot(cellId, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

fn uvWarp_hashCell(cellId: vec2<f32>) -> vec2<f32> {
  return uvWarp_voronoiRandom2(cellId);
}

fn uvWarp_voronoiCellLookup(p: vec2<f32>, scale: f32, jitter: f32) -> UvWarpVoronoiCell {
  let safeScale = max(scale, 0.001);
  let domain = p * safeScale;
  let i = floor(domain);
  var f1 = 8.0;
  var f2 = 8.0;
  var cellId = vec2<f32>(0.0, 0.0);
  var seed = vec2<f32>(0.0, 0.0);

  for (var y: i32 = -1; y <= 1; y = y + 1) {
    for (var x: i32 = -1; x <= 1; x = x + 1) {
      let neighbor = vec2<f32>(f32(x), f32(y));
      let cell = i + neighbor;
      let point = uvWarp_voronoiRandom2(cell) * jitter;
      let seedPos = i + neighbor + point;
      let diff = seedPos - domain;
      let dist = length(diff);
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
        cellId = cell;
        seed = seedPos / safeScale;
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }

  var result: UvWarpVoronoiCell;
  result.cellId = cellId;
  result.seed = seed;
  result.f1 = f1;
  result.f2 = f2;
  result.cellHash = uvWarp_voronoiHash21(cellId);
  return result;
}
`.trim();
}
