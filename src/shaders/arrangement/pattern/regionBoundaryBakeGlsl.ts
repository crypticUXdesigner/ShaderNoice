import type { NodeInstance } from '../../../data-model/types';

import type { ArrangementSnapshot } from '../../../audiotool/arrangement/types';

import { arrangementLanesGlslSuffix } from '../packArrangementRegionsForGlsl';

import { filterRegionPatternForNode, type RegionPatternPackResult } from './regionBoundaryBake';
import {
  isArrangementPatternRegionNodeType,
  isArrangementPatternTrackEnergyNodeType,
  MAX_PATTERN_RELEASE_BIN_LOOP,
  MAX_PATTERN_SHUTTER_BOUNDARY_LOOP,
  MAX_PATTERN_TRACK_LOOP,
} from './constants';

export type RegionPatternBakeParts = {
  includeBoundaries: boolean;
  includeTrackEnergy: boolean;
};

export function resolveRegionPatternBakeParts(nodeType: string): RegionPatternBakeParts {
  if (isArrangementPatternTrackEnergyNodeType(nodeType)) {
    return { includeBoundaries: false, includeTrackEnergy: true };
  }
  if (isArrangementPatternRegionNodeType(nodeType)) {
    return { includeBoundaries: true, includeTrackEnergy: false };
  }
  return { includeBoundaries: true, includeTrackEnergy: false };
}



const ARRANGEMENT_PATTERN_REGION_BAKE_PLACEHOLDER = '{{ARRANGEMENT_PATTERN_REGION_BAKE}}';

const NODE_SUFFIX_PLACEHOLDER = '{{NODE_SUFFIX}}';



function fmtGlslFloat(v: number): string {

  if (!Number.isFinite(v)) return '0.0';

  const s = v.toFixed(6);

  return s.includes('.') ? s : `${s}.0`;

}



function fmtWgslFloat(v: number): string {

  return fmtGlslFloat(v);

}



function appendBoundaryBake(lines: string[], suffix: string, pack: RegionPatternPackResult): void {

  const count = pack.boundaries.length;

  lines.push(`const int ARR_PATTERN_BOUNDARY_COUNT_${suffix} = ${count};`);



  if (count === 0) {

    lines.push(`const vec4 ARR_PATTERN_BOUNDARIES_${suffix}[1] = vec4[1](vec4(0.0));`);

    return;

  }



  const entries = pack.boundaries.map(

    (b) =>

      `vec4(${fmtGlslFloat(b.time)}, ${fmtGlslFloat(b.trackRow)}, ${fmtGlslFloat(b.kind)}, ${fmtGlslFloat(b.isEnd)})`

  );

  lines.push(

    `const vec4 ARR_PATTERN_BOUNDARIES_${suffix}[${count}] = vec4[${count}](${entries.join(', ')});`

  );

}



function appendTrackEnergyBake(lines: string[], suffix: string, pack: RegionPatternPackResult): void {
  const trackCount = pack.trackCount;

  lines.push(

    `const int ARR_PATTERN_TRACK_COUNT_${suffix} = ${trackCount};`,

    `const int ARR_PATTERN_TRACK_BIN_COUNT_${suffix} = ${pack.binCount};`,

    `const float ARR_PATTERN_TRACK_BIN_WIDTH_${suffix} = ${fmtGlslFloat(pack.binWidthSeconds)};`,

    `const float ARR_PATTERN_TRACK_DURATION_${suffix} = ${fmtGlslFloat(pack.durationSeconds)};`

  );



  if (pack.binCount === 0 || trackCount === 0) {

    lines.push(`const vec3 ARR_PATTERN_TRACK_ENERGY_${suffix}[1] = vec3[1](vec3(0.0));`);

    return;

  }



  const tableSize = trackCount * pack.binCount;

  const entries = pack.trackEnergyBins.map(

    (b) =>

      `vec3(${fmtGlslFloat(b.energy)}, ${fmtGlslFloat(b.meanPitch)}, ${fmtGlslFloat(b.maxVelocity)})`

  );

  lines.push(

    `const vec3 ARR_PATTERN_TRACK_ENERGY_${suffix}[${tableSize}] = vec3[${tableSize}](${entries.join(', ')});`

  );

}



function appendBoundaryBakeWgsl(lines: string[], suffix: string, pack: RegionPatternPackResult): void {

  const count = pack.boundaries.length;

  const arraySize = Math.max(1, count);

  lines.push(`const ARR_PATTERN_BOUNDARY_COUNT_${suffix}: i32 = ${count};`);



  if (count === 0) {

    lines.push(

      `const ARR_PATTERN_BOUNDARIES_${suffix}: array<vec4<f32>, 1> = array<vec4<f32>, 1>(vec4<f32>(0.0));`

    );

    return;

  }



  const entries = pack.boundaries.map(

    (b) =>

      `vec4<f32>(${fmtWgslFloat(b.time)}, ${fmtWgslFloat(b.trackRow)}, ${fmtWgslFloat(b.kind)}, ${fmtWgslFloat(b.isEnd)})`

  );

  lines.push(

    `const ARR_PATTERN_BOUNDARIES_${suffix}: array<vec4<f32>, ${arraySize}> = array<vec4<f32>, ${arraySize}>(${entries.join(', ')});`

  );

}



function appendTrackEnergyBakeWgsl(lines: string[], suffix: string, pack: RegionPatternPackResult): void {

  const trackCount = pack.trackCount;

  lines.push(

    `const ARR_PATTERN_TRACK_COUNT_${suffix}: i32 = ${trackCount};`,

    `const ARR_PATTERN_TRACK_BIN_COUNT_${suffix}: i32 = ${pack.binCount};`,

    `const ARR_PATTERN_TRACK_BIN_WIDTH_${suffix}: f32 = ${fmtWgslFloat(pack.binWidthSeconds)};`,

    `const ARR_PATTERN_TRACK_DURATION_${suffix}: f32 = ${fmtWgslFloat(pack.durationSeconds)};`

  );



  if (pack.binCount === 0 || trackCount === 0) {

    lines.push(

      `const ARR_PATTERN_TRACK_ENERGY_${suffix}: array<vec3<f32>, 1> = array<vec3<f32>, 1>(vec3<f32>(0.0));`

    );

    return;

  }



  const tableSize = trackCount * pack.binCount;

  const entries = pack.trackEnergyBins.map(

    (b) =>

      `vec3<f32>(${fmtWgslFloat(b.energy)}, ${fmtWgslFloat(b.meanPitch)}, ${fmtWgslFloat(b.maxVelocity)})`

  );

  lines.push(

    `const ARR_PATTERN_TRACK_ENERGY_${suffix}: array<vec3<f32>, ${tableSize}> = array<vec3<f32>, ${tableSize}>(${entries.join(', ')});`

  );

}



export function buildRegionPatternGlslBake(
  nodeId: string,
  pack: RegionPatternPackResult,
  parts: RegionPatternBakeParts
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const lines: string[] = [];

  if (parts.includeBoundaries) {
    appendBoundaryBake(lines, suffix, pack);
  }
  if (parts.includeTrackEnergy) {
    appendTrackEnergyBake(lines, suffix, pack);
  }

  return lines.join('\n');
}

export function buildRegionPatternWgslBake(
  nodeId: string,
  pack: RegionPatternPackResult,
  parts: RegionPatternBakeParts
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const lines: string[] = [];

  if (parts.includeBoundaries) {
    appendBoundaryBakeWgsl(lines, suffix, pack);
  }
  if (parts.includeTrackEnergy) {
    appendTrackEnergyBakeWgsl(lines, suffix, pack);
  }

  return lines.join('\n');
}



/**

 * Inject per-instance region pattern bake tables into pattern-node GLSL (placeholder

 * `{{ARRANGEMENT_PATTERN_REGION_BAKE}}`).

 */

export function injectArrangementPatternRegionBake(

  funcCode: string,

  node: NodeInstance,

  snapshot: ArrangementSnapshot | undefined

): string {

  const suffix = arrangementLanesGlslSuffix(node.id);

  const pack = filterRegionPatternForNode(snapshot, node);
  const parts = resolveRegionPatternBakeParts(node.type);
  const bake = buildRegionPatternGlslBake(node.id, pack, parts);

  return funcCode

    .replace(ARRANGEMENT_PATTERN_REGION_BAKE_PLACEHOLDER, bake)

    .replaceAll(NODE_SUFFIX_PLACEHOLDER, suffix);

}



const BOUNDARY_SHUTTER_RAYS_WGSL_EVAL = String.raw`
fn boundaryShutterRaysUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

fn boundaryShutterRaysSpokeWgsl(theta: f32, phase: f32, rayCount: i32, width: f32) -> f32 {
  let spoke = fract((theta + phase) / ARR_PATTERN_TAU * f32(rayCount));
  let spokeDist = min(spoke, 1.0 - spoke) * 2.0;
  return 1.0 - smoothstep(width * 0.5, width, spokeDist);
}
`.trim();

/** Per-instance WGSL helper for `boundary-shutter-rays` (bake tables + eval). */
export function buildBoundaryShutterRaysWgslNodeHelper(
  nodeId: string,
  pack: RegionPatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildRegionPatternWgslBake(nodeId, pack, {
    includeBoundaries: true,
    includeTrackEnergy: false,
  });
  const maxLoop = MAX_PATTERN_SHUTTER_BOUNDARY_LOOP;
  return [
    bake,
    BOUNDARY_SHUTTER_RAYS_WGSL_EVAL,
    `fn evalBoundaryShutterRays_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  window: f32,
  rayCount: i32,
  width: f32,
  spin: f32,
  endPolarity: f32,
  kindFilter: i32,
  center: vec2<f32>,
) -> f32 {
  let d = uv - center;
  let theta = atan2(d.y, d.x);
  let r = length(d);

  var mask: f32 = 0.0;
  let count = ARR_PATTERN_BOUNDARY_COUNT_${suffix};

  for (var i: i32 = 0; i < count; i++) {
    if (i >= ${maxLoop}) {
      break;
    }

    let boundary = ARR_PATTERN_BOUNDARIES_${suffix}[i];
    let bTime = boundary.x;
    let kind = boundary.z;
    let isEnd = boundary.w;

    if (kindFilter >= 0 && i32(kind + 0.5) != kindFilter) {
      continue;
    }

    let age = timelineTime - bTime;
    if (age < 0.0 || age > window) {
      continue;
    }

    var phase = spin * age;
    if (isEnd >= 0.5) {
      phase += endPolarity * ARR_PATTERN_TAU;
    }

    let ray = boundaryShutterRaysSpokeWgsl(theta, phase, rayCount, width);

    let expand = age / max(window, 0.001);
    let gateR = expand * 0.55 + 0.08;
    let radialGate = smoothstep(gateR - 0.06, gateR, r) * (1.0 - smoothstep(0.92, 0.98, r));

    let fade = 1.0 - age / max(window, 0.001);
    let contrib = ray * radialGate * fade;

    mask = max(mask, contrib);
  }

  return mask;
}`,
  ].join('\n\n');
}

/** Per-instance WGSL helper for `track-halo-lattice` (bake tables + eval). */
export function buildTrackHaloLatticeWgslNodeHelper(
  nodeId: string,
  pack: RegionPatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildRegionPatternWgslBake(nodeId, pack, {
    includeBoundaries: false,
    includeTrackEnergy: true,
  });
  const maxReleaseLoop = MAX_PATTERN_RELEASE_BIN_LOOP;
  const maxTrackLoop = MAX_PATTERN_TRACK_LOOP;

  const evalBlock = `
fn trackHaloLatticeReadBinWgsl_${suffix}(trackIndex: i32, binIndex: i32) -> vec3<f32> {
  let binCount = ARR_PATTERN_TRACK_BIN_COUNT_${suffix};
  let idx = trackIndex * binCount + binIndex;
  return ARR_PATTERN_TRACK_ENERGY_${suffix}[idx];
}

fn trackHaloLatticeEnergyAtWgsl_${suffix}(trackIndex: i32, time: f32, decaySeconds: f32) -> vec3<f32> {
  if (ARR_PATTERN_TRACK_BIN_COUNT_${suffix} == 0) {
    return vec3<f32>(0.0, 60.0, 0.0);
  }

  let rel = max(decaySeconds, 0.001);
  let t0 = max(0.0, time - rel);
  let i0 = clamp(i32(floor(t0 / ARR_PATTERN_TRACK_BIN_WIDTH_${suffix})), 0, ARR_PATTERN_TRACK_BIN_COUNT_${suffix} - 1);
  let i1 = clamp(i32(floor(time / ARR_PATTERN_TRACK_BIN_WIDTH_${suffix})), 0, ARR_PATTERN_TRACK_BIN_COUNT_${suffix} - 1);
  var energy: f32 = 0.0;
  var meanPitch: f32 = 60.0;

  for (var i: i32 = i0; i <= i1; i++) {
    if (i - i0 >= ${maxReleaseLoop}) {
      break;
    }
    let binCenter = (f32(i) + 0.5) * ARR_PATTERN_TRACK_BIN_WIDTH_${suffix};
    let age = time - binCenter;
    if (age < 0.0 || age > rel) {
      continue;
    }
    let decayFactor = 1.0 - age / rel;
    let bin = trackHaloLatticeReadBinWgsl_${suffix}(trackIndex, i);
    let e = bin.x * decayFactor;
    if (e > energy) {
      energy = e;
      meanPitch = bin.y;
    }
  }

  return vec3<f32>(energy, meanPitch, 0.0);
}

fn trackHaloLatticeCellWgsl_${suffix}(latticeUv: vec2<f32>, haloSize: f32) -> f32 {
  let cell = fract(latticeUv);
  let dist = length(cell - vec2<f32>(0.5));
  let half = max(0.0001, haloSize * 0.5);
  return 1.0 - smoothstep(half * 0.35, half, dist);
}

fn evalTrackHaloLattice_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  latticeScale: f32,
  haloSize: f32,
  decaySeconds: f32,
  trackSpread: f32,
  contrast: f32,
  maxTracks: i32,
  center: vec2<f32>,
) -> TrackHaloLatticeResultWgsl {
  var mask: f32 = 0.0;
  var trackMask: f32 = 0.0;
  let trackCount = min(ARR_PATTERN_TRACK_COUNT_${suffix}, maxTracks);
  var bestEnergy: f32 = 0.0;
  var bestTrack: i32 = 0;

  for (var t: i32 = 0; t < trackCount; t++) {
    if (t >= ${maxTrackLoop}) {
      break;
    }

    let energySample = trackHaloLatticeEnergyAtWgsl_${suffix}(t, timelineTime, decaySeconds);
    let energy = energySample.x;
    let meanPitch = energySample.y;
    if (energy <= 0.0) {
      continue;
    }

    let angle = f32(t) * TRACK_HALO_GOLDEN + arrPattern_pitchToAngle(meanPitch);
    let offset = trackSpread * vec2<f32>(cos(angle), sin(angle));
    let latticeUv = (uv - center + offset) * latticeScale;
    let halo = trackHaloLatticeCellWgsl_${suffix}(latticeUv, haloSize);
    let contrib = arrPattern_saturate(halo * energy * contrast);

    mask = max(mask, contrib);

    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestTrack = t;
    }
  }

  if (bestEnergy > 0.0) {
    trackMask = arrPattern_trackOrderNorm(
      f32(bestTrack),
      f32(ARR_PATTERN_TRACK_COUNT_${suffix})
    );
  }

  return TrackHaloLatticeResultWgsl(mask, trackMask);
}`.trim();

  return [
    bake,
    `const TRACK_HALO_GOLDEN: f32 = 2.39996322972865332;

struct TrackHaloLatticeResultWgsl {
  mask: f32,
  trackMask: f32,
}

fn trackHaloLatticeUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}`,
    evalBlock,
  ].join('\n\n');
}

export { ARRANGEMENT_PATTERN_REGION_BAKE_PLACEHOLDER };


