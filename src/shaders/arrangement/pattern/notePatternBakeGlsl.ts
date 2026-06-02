import type { NodeInstance } from '../../../data-model/types';
import type { ArrangementSnapshot } from '../../../audiotool/arrangement/types';
import { setArrangementPatternOnsetBakeCache } from '../../../audiotool/arrangement/arrangementPatternOnsetBakeCache';
import { arrangementTrackFilterCacheKey } from '../../../audiotool/arrangement/arrangementTrackFilter';
import { logNotePatternBakeDiagnostics } from '../../../audiotool/arrangement/arrangementPatternDiagnostics';
import { arrangementLanesGlslSuffix } from '../packArrangementRegionsForGlsl';
import {
  filterNotePatternForNode,
  readArrangementPatternPackOptions,
  type NotePatternPackResult,
} from './notePatternBake';
import {
  MAX_PATTERN_ACTIVE_SITES,
  MAX_PATTERN_RELEASE_BIN_LOOP,
  MAX_PATTERN_COMET_ONSET_LOOP,
  MAX_PATTERN_GRAVITY_ONSET_LOOP,
  MAX_PATTERN_ONSET_LOOP,
  MAX_PATTERN_SPARK_GRID_ONSET_LOOP,
  MAX_PATTERN_WINDOW_BIN_LOOP,
} from './constants';

const ARRANGEMENT_PATTERN_NOTE_BAKE_PLACEHOLDER = '{{ARRANGEMENT_PATTERN_NOTE_BAKE}}';
const NODE_SUFFIX_PLACEHOLDER = '{{NODE_SUFFIX}}';

function fmtGlslFloat(v: number): string {
  if (!Number.isFinite(v)) return '0.0';
  const s = v.toFixed(6);
  return s.includes('.') ? s : `${s}.0`;
}

function fmtWgslFloat(v: number): string {
  return fmtGlslFloat(v);
}

function pitchClassEntriesGlsl(energy: readonly number[]): string {
  const e0 = energy.slice(0, 4);
  const e1 = energy.slice(4, 8);
  const e2 = energy.slice(8, 12);
  return [
    `vec4(${e0.map(fmtGlslFloat).join(', ')})`,
    `vec4(${e1.map(fmtGlslFloat).join(', ')})`,
    `vec4(${e2.map(fmtGlslFloat).join(', ')})`,
  ].join(', ');
}

function pitchClassEntriesWgsl(energy: readonly number[]): string {
  const e0 = energy.slice(0, 4);
  const e1 = energy.slice(4, 8);
  const e2 = energy.slice(8, 12);
  return [
    `vec4<f32>(${e0.map(fmtWgslFloat).join(', ')})`,
    `vec4<f32>(${e1.map(fmtWgslFloat).join(', ')})`,
    `vec4<f32>(${e2.map(fmtWgslFloat).join(', ')})`,
  ].join(', ');
}

function appendTimeBinBake(lines: string[], suffix: string, pack: NotePatternPackResult): void {
  const binCount = Math.max(1, pack.binCount);
  lines.push(
    `const int ARR_PATTERN_BIN_COUNT_${suffix} = ${pack.binCount};`,
    `const float ARR_PATTERN_BIN_WIDTH_${suffix} = ${fmtGlslFloat(pack.binWidthSeconds)};`,
    `const float ARR_PATTERN_DURATION_${suffix} = ${fmtGlslFloat(pack.durationSeconds)};`
  );

  if (pack.binCount === 0) {
    lines.push(`const vec4 ARR_PATTERN_TIME_BIN_${suffix}[1] = vec4[1](vec4(0.0));`);
    return;
  }

  const entries = pack.timeBins.map((bin) =>
    `vec4(${fmtGlslFloat(bin.onsetCount)}, ${fmtGlslFloat(bin.maxVelocity)}, ${fmtGlslFloat(bin.meanVelocity)}, ${fmtGlslFloat(bin.meanPitch)})`
  );
  lines.push(
    `const vec4 ARR_PATTERN_TIME_BIN_${suffix}[${binCount}] = vec4[${binCount}](${entries.join(', ')});`
  );
}

function appendActiveBinBake(lines: string[], suffix: string, pack: NotePatternPackResult): void {
  const binCount = Math.max(1, pack.binCount);
  if (pack.binCount === 0) {
    lines.push(
      `const float ARR_PATTERN_ACTIVE_COUNT_${suffix}[1] = float[1](0.0);`,
      `const vec4 ARR_PATTERN_PC_${suffix}[3] = vec4[3](vec4(0.0), vec4(0.0), vec4(0.0));`
    );
    return;
  }

  const activeCounts = pack.activeBins.map((b) => fmtGlslFloat(b.activeCount));
  lines.push(
    `const float ARR_PATTERN_ACTIVE_COUNT_${suffix}[${binCount}] = float[${binCount}](${activeCounts.join(', ')});`
  );

  const pcEntries = pack.activeBins.flatMap((b) => pitchClassEntriesGlsl(b.pitchClassEnergy));
  lines.push(
    `const vec4 ARR_PATTERN_PC_${suffix}[${pack.binCount * 3}] = vec4[${pack.binCount * 3}](${pcEntries.join(', ')});`
  );
}

function appendOnsetBake(lines: string[], suffix: string, pack: NotePatternPackResult): void {
  const count = pack.onsets.length;
  lines.push(`const int ARR_PATTERN_ONSET_COUNT_${suffix} = ${count};`);

  if (count === 0) {
    lines.push(
      `const vec4 ARR_PATTERN_ONSETS_${suffix}[1] = vec4[1](vec4(0.0));`,
      `const float ARR_PATTERN_ONSET_TRACK_${suffix}[1] = float[1](0.0);`
    );
    return;
  }

  const entries = pack.onsets.map(
    (o) =>
      `vec4(${fmtGlslFloat(o.startSeconds)}, ${fmtGlslFloat(o.endSeconds)}, ${fmtGlslFloat(o.pitch)}, ${fmtGlslFloat(o.velocity)})`
  );
  const trackEntries = pack.onsets.map((o) => fmtGlslFloat(o.trackIndex));
  lines.push(
    `const vec4 ARR_PATTERN_ONSETS_${suffix}[${count}] = vec4[${count}](${entries.join(', ')});`,
    `const float ARR_PATTERN_ONSET_TRACK_${suffix}[${count}] = float[${count}](${trackEntries.join(', ')});`
  );
}

export function buildNotePatternGlslBake(nodeId: string, pack: NotePatternPackResult): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const lines: string[] = [];
  appendTimeBinBake(lines, suffix, pack);
  appendActiveBinBake(lines, suffix, pack);
  appendOnsetBake(lines, suffix, pack);
  return lines.join('\n');
}

function appendTimeBinBakeWgsl(lines: string[], suffix: string, pack: NotePatternPackResult): void {
  const binCount = Math.max(1, pack.binCount);
  lines.push(
    `const ARR_PATTERN_BIN_COUNT_${suffix}: i32 = ${pack.binCount};`,
    `const ARR_PATTERN_BIN_WIDTH_${suffix}: f32 = ${fmtWgslFloat(pack.binWidthSeconds)};`,
    `const ARR_PATTERN_DURATION_${suffix}: f32 = ${fmtWgslFloat(pack.durationSeconds)};`
  );

  if (pack.binCount === 0) {
    lines.push(`const ARR_PATTERN_TIME_BIN_${suffix}: array<vec4<f32>, 1> = array<vec4<f32>, 1>(vec4<f32>(0.0));`);
    return;
  }

  const entries = pack.timeBins.map((bin) =>
    `vec4<f32>(${fmtWgslFloat(bin.onsetCount)}, ${fmtWgslFloat(bin.maxVelocity)}, ${fmtWgslFloat(bin.meanVelocity)}, ${fmtWgslFloat(bin.meanPitch)})`
  );
  lines.push(
    `const ARR_PATTERN_TIME_BIN_${suffix}: array<vec4<f32>, ${binCount}> = array<vec4<f32>, ${binCount}>(${entries.join(', ')});`
  );
}

function appendActiveBinBakeWgsl(lines: string[], suffix: string, pack: NotePatternPackResult): void {
  const binCount = Math.max(1, pack.binCount);
  if (pack.binCount === 0) {
    lines.push(
      `const ARR_PATTERN_ACTIVE_COUNT_${suffix}: array<f32, 1> = array<f32, 1>(0.0);`,
      `const ARR_PATTERN_PC_${suffix}: array<vec4<f32>, 3> = array<vec4<f32>, 3>(vec4<f32>(0.0), vec4<f32>(0.0), vec4<f32>(0.0));`
    );
    return;
  }

  const activeCounts = pack.activeBins.map((b) => fmtWgslFloat(b.activeCount));
  lines.push(
    `const ARR_PATTERN_ACTIVE_COUNT_${suffix}: array<f32, ${binCount}> = array<f32, ${binCount}>(${activeCounts.join(', ')});`
  );

  const pcEntries = pack.activeBins.flatMap((b) => pitchClassEntriesWgsl(b.pitchClassEnergy));
  lines.push(
    `const ARR_PATTERN_PC_${suffix}: array<vec4<f32>, ${pack.binCount * 3}> = array<vec4<f32>, ${pack.binCount * 3}>(${pcEntries.join(', ')});`
  );
}

function appendOnsetBakeWgsl(lines: string[], suffix: string, pack: NotePatternPackResult): void {
  const count = pack.onsets.length;
  const arraySize = Math.max(1, count);
  lines.push(`const ARR_PATTERN_ONSET_COUNT_${suffix}: i32 = ${count};`);

  if (count === 0) {
    lines.push(
      `const ARR_PATTERN_ONSETS_${suffix}: array<vec4<f32>, 1> = array<vec4<f32>, 1>(vec4<f32>(0.0));`,
      `const ARR_PATTERN_ONSET_TRACK_${suffix}: array<f32, 1> = array<f32, 1>(0.0);`
    );
    return;
  }

  const entries = pack.onsets.map(
    (o) =>
      `vec4<f32>(${fmtWgslFloat(o.startSeconds)}, ${fmtWgslFloat(o.endSeconds)}, ${fmtWgslFloat(o.pitch)}, ${fmtWgslFloat(o.velocity)})`
  );
  const trackEntries = pack.onsets.map((o) => fmtWgslFloat(o.trackIndex));
  lines.push(
    `const ARR_PATTERN_ONSETS_${suffix}: array<vec4<f32>, ${arraySize}> = array<vec4<f32>, ${arraySize}>(${entries.join(', ')});`,
    `const ARR_PATTERN_ONSET_TRACK_${suffix}: array<f32, ${arraySize}> = array<f32, ${arraySize}>(${trackEntries.join(', ')});`
  );
}

export function buildNotePatternWgslBake(nodeId: string, pack: NotePatternPackResult): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const lines: string[] = [];
  appendTimeBinBakeWgsl(lines, suffix, pack);
  appendActiveBinBakeWgsl(lines, suffix, pack);
  appendOnsetBakeWgsl(lines, suffix, pack);
  return lines.join('\n');
}

/**
 * Inject per-instance note pattern bake tables into pattern-node GLSL (placeholder
 * `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`).
 */
export function injectArrangementPatternNoteBake(
  funcCode: string,
  node: NodeInstance,
  snapshot: ArrangementSnapshot | undefined
): string {
  const suffix = arrangementLanesGlslSuffix(node.id);
  const options = readArrangementPatternPackOptions(node);
  const pack = filterNotePatternForNode(snapshot, node);
  logNotePatternBakeDiagnostics(node.id, snapshot, pack, options.trackFilterMode, options.trackFilterList);
  setArrangementPatternOnsetBakeCache(
    node.id,
    pack.onsets,
    arrangementTrackFilterCacheKey(options)
  );
  const bake = buildNotePatternGlslBake(node.id, pack);
  return funcCode
    .replace(ARRANGEMENT_PATTERN_NOTE_BAKE_PLACEHOLDER, bake)
    .replaceAll(NODE_SUFFIX_PLACEHOLDER, suffix);
}

export { ARRANGEMENT_PATTERN_NOTE_BAKE_PLACEHOLDER };

const NOTE_RIPPLE_FIELD_WGSL_EVAL = String.raw`
fn noteRippleFieldPitchNormWgsl(pitch: f32) -> f32 {
  return arrPattern_saturate((pitch - 36.0) / 84.0);
}

fn noteRippleFieldRingWgsl(uv: vec2<f32>, origin: vec2<f32>, waveR: f32, width: f32, feather: f32) -> f32 {
  let dist = length(uv - origin);
  let dBand = abs(dist - waveR);
  let halfW = max(0.0001, width * 0.5);
  let feat = max(1e-5, feather);
  return 1.0 - smoothstep(halfW, halfW + feat, dBand);
}

fn noteRippleFieldUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}
`.trim();

/** Per-instance WGSL helper for `note-ripple-field` (bake tables + eval). */
export function buildNoteRippleFieldWgslNodeHelper(
  nodeId: string,
  pack: NotePatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildNotePatternWgslBake(nodeId, pack);
  const maxLoop = MAX_PATTERN_ONSET_LOOP;
  return [
    bake,
    NOTE_RIPPLE_FIELD_WGSL_EVAL,
    `struct NoteRippleFieldResult_${suffix} {
  mask: f32,
  energy: f32,
}

fn evalNoteRippleField_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  windowSeconds: f32,
  speed: f32,
  width: f32,
  feather: f32,
  pitchSpread: f32,
  center: vec2<f32>,
  onsetLoopStart: i32,
  onsetLoopEnd: i32,
) -> NoteRippleFieldResult_${suffix} {
  var mask: f32 = 0.0;
  var energy: f32 = 0.0;
  let windowStart = timelineTime - windowSeconds;
  let loopStart = max(onsetLoopStart, 0);
  let loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_${suffix});

  for (var i: i32 = loopStart; i < loopEnd; i++) {
    if ((i - loopStart) >= ${maxLoop}) {
      break;
    }
    let onset = ARR_PATTERN_ONSETS_${suffix}[i];
    let startT = onset.x;
    let pitch = onset.z;
    let velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) {
      continue;
    }

    let age = timelineTime - startT;
    if (age < 0.0 || age > windowSeconds) {
      continue;
    }

    let angle = arrPattern_pitchToAngle(pitch);
    let pitchNorm = noteRippleFieldPitchNormWgsl(pitch);
    let radius = pitchNorm * pitchSpread * 0.48;
    let origin = center + radius * vec2<f32>(cos(angle), sin(angle));

    let waveR = age * speed;
    let ring = noteRippleFieldRingWgsl(uv, origin, waveR, width, feather);
    let decay = exp(-age / max(windowSeconds, 0.001));
    let contrib = ring * decay * velocity;

    mask = max(mask, contrib);
    energy = min(1.0, energy + contrib);
  }

  return NoteRippleFieldResult_${suffix}(mask, energy);
}`,
  ].join('\n\n');
}

const PITCH_CLASS_COMPASS_WGSL_UV = String.raw`
fn pitchClassCompassUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}
`.trim();

/** Per-instance WGSL helper for `pitch-class-compass` (bake tables + eval). */
export function buildPitchClassCompassWgslNodeHelper(
  nodeId: string,
  pack: NotePatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildNotePatternWgslBake(nodeId, pack);
  const maxLoop = MAX_PATTERN_ONSET_LOOP;
  return [
    bake,
    PITCH_CLASS_COMPASS_WGSL_UV,
    `struct PitchClassCompassResult_${suffix} {
  mask: f32,
  color: vec4<f32>,
}

fn evalPitchClassCompass_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  windowSeconds: f32,
  decay: f32,
  sectors: f32,
  innerRadius: f32,
  outerRadius: f32,
  sectorSoftness: f32,
  radialBands: f32,
  center: vec2<f32>,
  onsetLoopStart: i32,
  onsetLoopEnd: i32,
) -> PitchClassCompassResult_${suffix} {
  let sectorCount = clamp(i32(floor(sectors + 0.5)), 2, 24);
  let offset = uv - center;
  let r = length(offset);
  let theta = atan2(offset.y, offset.x);
  let angle01 = fract(theta / arrPattern_tau() + 0.5);
  let sectorF = angle01 * f32(sectorCount);
  let pixelSector = i32(floor(sectorF)) % sectorCount;
  let sectorFrac = fract(sectorF);

  let radialSoft = 0.02;
  let radialMask = smoothstep(innerRadius - radialSoft, innerRadius, r)
    * (1.0 - smoothstep(outerRadius, outerRadius + radialSoft, r));

  let distToEdge = min(sectorFrac, 1.0 - sectorFrac);
  let sectorMask = smoothstep(0.0, sectorSoftness, distToEdge);

  let windowStart = timelineTime - windowSeconds;
  let rel = max(decay, 0.001);
  var energy: f32 = 0.0;
  let loopStart = max(onsetLoopStart, 0);
  let loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_${suffix});

  for (var i: i32 = loopStart; i < loopEnd; i++) {
    if ((i - loopStart) >= ${maxLoop}) {
      break;
    }
    let onset = ARR_PATTERN_ONSETS_${suffix}[i];
    let startT = onset.x;
    let pitch = onset.z;
    let velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) {
      continue;
    }

    let age = timelineTime - startT;
    if (age < 0.0 || age > rel) {
      continue;
    }

    let onsetSector = arrPattern_pitchToSector(pitch, sectorCount);
    if (onsetSector != pixelSector) {
      continue;
    }

    let pulse = (1.0 - age / rel) * velocity;
    energy = max(energy, pulse);
  }

  let bands = select(1.0, 0.5 + 0.5 * sin(r * radialBands * arrPattern_tau()), radialBands > 0.0);
  let mask = radialMask * sectorMask * energy * bands;

  let palettePc = arrPattern_pitchClassForSector(f32(pixelSector), f32(sectorCount));
  let rgb = arrPattern_pitchClassColor(palettePc);
  let color = vec4<f32>(rgb, energy);

  return PitchClassCompassResult_${suffix}(mask, color);
}`,
  ].join('\n\n');
}

const RHYTHM_STRIPE_FIELD_WGSL_EVAL = String.raw`
fn rhythmStripeFieldUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

fn rhythmStripeFieldRotateWgsl(v: vec2<f32>, angleRad: f32) -> vec2<f32> {
  let c = cos(angleRad);
  let s = sin(angleRad);
  return vec2<f32>(v.x * c - v.y * s, v.x * s + v.y * c);
}

struct RhythmStripeWindowSampleWgsl_${'SUFFIX'} {
  density: f32,
  meanPitch: f32,
  meanVelocity: f32,
}

fn rhythmStripeFieldSampleWindowWgsl_${'SUFFIX'}(time: f32, windowSec: f32, releaseSec: f32) -> RhythmStripeWindowSampleWgsl_${'SUFFIX'} {
  var s = RhythmStripeWindowSampleWgsl_${'SUFFIX'}(0.0, 60.0, 0.0);
  if (ARR_PATTERN_BIN_COUNT_${'SUFFIX'} == 0) {
    return s;
  }

  let win = max(windowSec, 0.001);
  let rel = max(releaseSec, 0.001);
  let t0 = max(0.0, time - win);
  let i0 = clamp(i32(floor(t0 / ARR_PATTERN_BIN_WIDTH_${'SUFFIX'})), 0, ARR_PATTERN_BIN_COUNT_${'SUFFIX'} - 1);
  let i1 = clamp(i32(floor(time / ARR_PATTERN_BIN_WIDTH_${'SUFFIX'})), 0, ARR_PATTERN_BIN_COUNT_${'SUFFIX'} - 1);

  var weightedOnsets: f32 = 0.0;
  var velSum: f32 = 0.0;
  var pitchSum: f32 = 0.0;

  for (var i: i32 = i0; i <= i1; i++) {
    if (i - i0 >= ${MAX_PATTERN_WINDOW_BIN_LOOP}) {
      break;
    }
    let binCenter = (f32(i) + 0.5) * ARR_PATTERN_BIN_WIDTH_${'SUFFIX'};
    let age = time - binCenter;
    if (age < 0.0 || age > win) {
      continue;
    }
    let decay = max(0.0, 1.0 - age / rel);
    let bin = ARR_PATTERN_TIME_BIN_${'SUFFIX'}[i];
    let w = bin.x * decay;
    weightedOnsets += w;
    if (bin.x > 0.0) {
      velSum += bin.z * w;
      pitchSum += bin.w * w;
    }
  }

  s.density = arrPattern_saturate(weightedOnsets / 4.0);
  s.meanVelocity = select(0.0, velSum / weightedOnsets, weightedOnsets > 0.0);
  s.meanPitch = select(60.0, pitchSum / weightedOnsets, weightedOnsets > 0.0);
  return s;
}
`.trim();

/** Per-instance WGSL helper for `rhythm-stripe-field` (bake tables + eval). */
export function buildRhythmStripeFieldWgslNodeHelper(
  nodeId: string,
  pack: NotePatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildNotePatternWgslBake(nodeId, pack);
  const evalWgsl = RHYTHM_STRIPE_FIELD_WGSL_EVAL.replaceAll('SUFFIX', suffix);
  return [
    bake,
    evalWgsl,
    `struct RhythmStripeFieldResult_${suffix} {
  mask: f32,
  warp: vec2<f32>,
  energy: f32,
}

fn evalRhythmStripeField_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  angleRad: f32,
  baseScale: f32,
  densityGain: f32,
  bendGain: f32,
  windowSec: f32,
  releaseSec: f32,
  sharpness: f32,
  warpAmount: f32,
  phaseSpeed: f32,
  phaseOffset: f32,
  velocityMix: f32,
  intensity: f32,
  idleMode: i32,
) -> RhythmStripeFieldResult_${suffix} {
  if (ARR_PATTERN_BIN_COUNT_${suffix} == 0 && idleMode == 0) {
    return RhythmStripeFieldResult_${suffix}(0.0, vec2<f32>(0.0), 0.0);
  }

  var win = rhythmStripeFieldSampleWindowWgsl_${suffix}(timelineTime, windowSec, releaseSec);
  if (ARR_PATTERN_BIN_COUNT_${suffix} == 0) {
    win.density = 0.0;
    win.meanPitch = 60.0;
    win.meanVelocity = 0.0;
  } else if (idleMode == 0 && win.density < 0.0001) {
    return RhythmStripeFieldResult_${suffix}(0.0, vec2<f32>(0.0), 0.0);
  }

  let energy = win.density;
  let scale = baseScale + win.density * densityGain;

  let centered = uv - vec2<f32>(0.5);
  let rotUv = rhythmStripeFieldRotateWgsl(centered, angleRad);

  let pitchPhase = arrPattern_pitchToAngle(win.meanPitch) * 0.25;
  let motion = phaseSpeed + velocityMix * win.meanVelocity * 2.0;
  let phase = pitchPhase + phaseOffset + timelineTime * motion;
  let bendAmp = win.density * bendGain;
  let bend = sin(rotUv.y * scale * 0.4 + phase) * bendAmp;

  let along = rotUv.x + bend;
  let stripeRaw = sin(along * scale * arrPattern_tau() + phase);
  let stripe01 = 0.5 + 0.5 * stripeRaw;

  let edge = mix(0.5, 0.015, arrPattern_saturate(sharpness));
  let mask = smoothstep(0.5 - edge, 0.5 + edge, stripe01) * intensity;

  let stripeNormal = vec2<f32>(-sin(angleRad), cos(angleRad));
  let warp = stripeNormal * bend * warpAmount;

  return RhythmStripeFieldResult_${suffix}(mask, warp, energy);
}`,
  ].join('\n\n');
}

const VELOCITY_SPARK_GRID_WGSL_UV = String.raw`
fn velocitySparkGridUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

fn velocitySparkGridGridDimsWgsl(gridScaleX: f32, gridScaleY: f32) -> vec2<f32> {
  return vec2<f32>(max(2.0, gridScaleX), max(2.0, gridScaleY));
}

fn velocitySparkGridTargetCellWgsl(
  pitch: f32,
  trackIndex: f32,
  pitchShuffle: f32,
  gridDims: vec2<f32>,
) -> vec2<f32> {
  let seed = vec2<f32>(pitch * pitchShuffle, trackIndex);
  let hash01 = vec2<f32>(
    arrPattern_hash22(seed),
    arrPattern_hash11(pitch + trackIndex * 17.0 + pitchShuffle),
  );
  return floor(hash01 * gridDims);
}

fn velocitySparkGridDotWgsl(
  uv: vec2<f32>,
  targetCell: vec2<f32>,
  gridDims: vec2<f32>,
  radius: f32,
  feather: f32,
) -> f32 {
  let localUv = uv * gridDims - targetCell;
  let dist = length(localUv - vec2<f32>(0.5));
  let halfR = max(0.0001, radius * 0.5);
  let feat = max(1e-5, feather);
  return 1.0 - smoothstep(halfR, halfR + feat, dist);
}

fn velocitySparkGridCellFillWgsl(uv: vec2<f32>, gridDims: vec2<f32>, feather: f32) -> f32 {
  let cellUv = fract(uv * gridDims);
  let edgeDist = min(cellUv, vec2<f32>(1.0) - cellUv);
  let d = min(edgeDist.x, edgeDist.y);
  return 1.0 - smoothstep(0.0, max(1e-5, feather), d);
}

fn velocitySparkGridSparkMaskWgsl(
  uv: vec2<f32>,
  targetCell: vec2<f32>,
  gridDims: vec2<f32>,
  radius: f32,
  feather: f32,
  shape: i32,
) -> f32 {
  if (shape == 1) {
    return velocitySparkGridCellFillWgsl(uv, gridDims, feather);
  }
  return velocitySparkGridDotWgsl(uv, targetCell, gridDims, radius, feather);
}

fn velocitySparkGridFadeWgsl(age: f32, decaySeconds: f32, decayCurve: i32, attack: f32) -> f32 {
  let safeDecay = max(decaySeconds, 0.001);
  let t = arrPattern_saturate(age / safeDecay);
  let fade = select(exp(-age / safeDecay), 1.0 - t, decayCurve == 1);
  let attackBoost = 1.0 + attack * exp(-age / max(safeDecay * 0.08, 0.001));
  return fade * attackBoost;
}

fn velocitySparkGridGridLinesWgsl(uv: vec2<f32>, gridDims: vec2<f32>) -> f32 {
  let g = fract(uv * gridDims);
  let edgeDist = min(g, vec2<f32>(1.0) - g);
  let d = min(edgeDist.x, edgeDist.y);
  return 1.0 - smoothstep(0.0, 0.015, d);
}
`.trim();

/** Per-instance WGSL helper for `velocity-spark-grid` (bake tables + eval). */
export function buildVelocitySparkGridWgslNodeHelper(
  nodeId: string,
  pack: NotePatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildNotePatternWgslBake(nodeId, pack);
  const maxLoop = MAX_PATTERN_SPARK_GRID_ONSET_LOOP;
  return [
    bake,
    VELOCITY_SPARK_GRID_WGSL_UV,
    `struct VelocitySparkGridResult_${suffix} {
  mask: f32,
  cellId: f32,
  energy: f32,
  lines: f32,
}

fn evalVelocitySparkGrid_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  gridScaleX: f32,
  gridScaleY: f32,
  decaySeconds: f32,
  dotSize: f32,
  feather: f32,
  pitchShuffle: f32,
  shape: i32,
  velSize: f32,
  velBright: f32,
  minVelocity: f32,
  blendMode: i32,
  decayCurve: i32,
  attack: f32,
  onsetLoopStart: i32,
  onsetLoopEnd: i32,
) -> VelocitySparkGridResult_${suffix} {
  let gridDims = velocitySparkGridGridDimsWgsl(gridScaleX, gridScaleY);
  let lines = velocitySparkGridGridLinesWgsl(uv, gridDims);

  if (ARR_PATTERN_ONSET_COUNT_${suffix} == 0) {
    return VelocitySparkGridResult_${suffix}(0.0, 0.0, 0.0, lines);
  }

  var mask: f32 = 0.0;
  var cellId: f32 = 0.0;
  var energy: f32 = 0.0;
  var brightestContrib: f32 = 0.0;
  let cell = floor(uv * gridDims);
  let windowStart = timelineTime - decaySeconds;
  let loopStart = max(onsetLoopStart, 0);
  let loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_${suffix});

  for (var i: i32 = loopStart; i < loopEnd; i++) {
    if ((i - loopStart) >= ${maxLoop}) {
      break;
    }
    let onset = ARR_PATTERN_ONSETS_${suffix}[i];
    let startT = onset.x;
    let pitch = onset.z;
    let velocity = onset.w;
    let trackIdx = ARR_PATTERN_ONSET_TRACK_${suffix}[i];

    if (startT > timelineTime || startT < windowStart) {
      continue;
    }

    if (velocity < minVelocity) {
      continue;
    }

    let age = timelineTime - startT;
    if (age < 0.0 || age > decaySeconds) {
      continue;
    }

    let targetCell = velocitySparkGridTargetCellWgsl(pitch, trackIdx, pitchShuffle, gridDims);
    if (abs(targetCell.x - cell.x) > 0.5 || abs(targetCell.y - cell.y) > 0.5) {
      continue;
    }

    let velSizeMul = mix(1.0, velocity, velSize);
    let velBrightMul = mix(1.0, velocity, velBright);
    let radius = dotSize * velSizeMul;
    let dot = velocitySparkGridSparkMaskWgsl(uv, targetCell, gridDims, radius, feather, shape);
    let fade = velocitySparkGridFadeWgsl(age, decaySeconds, decayCurve, attack);
    let contrib = dot * fade * velBrightMul;

    energy += contrib;

    if (contrib > brightestContrib) {
      brightestContrib = contrib;
      cellId = arrPattern_hash22(targetCell + vec2<f32>(pitch * 0.01, trackIdx));
    }

    if (blendMode == 1) {
      mask += contrib;
    } else if (contrib > mask) {
      mask = contrib;
    }
  }

  mask = arrPattern_saturate(mask);
  energy = arrPattern_saturate(energy);

  return VelocitySparkGridResult_${suffix}(mask, cellId, energy, lines);
}`,
  ].join('\n\n');
}

const DURATION_COMET_TRAILS_WGSL_UV = String.raw`
fn durationCometTrailsUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

fn durationCometPitchNormWgsl(pitch: f32) -> f32 {
  return arrPattern_saturate((pitch - 36.0) / 84.0);
}

fn durationCometDurationScaleWgsl(durationSec: f32, durationGain: f32) -> f32 {
  return arrPattern_saturate(durationSec * durationGain * 6.0);
}

fn durationCometTrailLenWgsl(baseLen: f32, durationSec: f32, durationGain: f32) -> f32 {
  return baseLen * (0.2 + durationCometDurationScaleWgsl(durationSec, durationGain));
}

fn durationCometDistToSegWgsl(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
  let ab = b - a;
  let denom = max(dot(ab, ab), 1e-8);
  let t = clamp(dot(p - a, ab) / denom, 0.0, 1.0);
  return length(p - (a + ab * t));
}

fn durationCometSampleTrailWgsl(
  uv: vec2<f32>,
  head: vec2<f32>,
  dir: vec2<f32>,
  perp: vec2<f32>,
  trailLen: f32,
  bend: f32,
  width: f32,
) -> f32 {
  var best: f32 = 1e5;
  var prev = head;
  for (var k: i32 = 1; k <= 10; k++) {
    let t = f32(k) / 10.0 * trailLen;
    let pt = head - dir * t + perp * bend * sin(t * 18.0) * trailLen;
    best = min(best, durationCometDistToSegWgsl(uv, prev, pt));
    prev = pt;
  }
  let halfW = max(0.0001, width * 0.5);
  return 1.0 - smoothstep(halfW, halfW + width, best);
}

fn durationCometHeadGlintWgsl(uv: vec2<f32>, head: vec2<f32>, width: f32) -> f32 {
  let d = length(uv - head);
  let r = max(0.0001, width * 1.6);
  return 1.0 - smoothstep(r * 0.35, r, d);
}
`.trim();

/** Per-instance WGSL helper for `duration-comet-trails` (bake tables + eval). */
export function buildDurationCometTrailsWgslNodeHelper(
  nodeId: string,
  pack: NotePatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildNotePatternWgslBake(nodeId, pack);
  const maxLoop = MAX_PATTERN_COMET_ONSET_LOOP;
  return [
    bake,
    DURATION_COMET_TRAILS_WGSL_UV,
    `struct DurationCometTrailsResult_${suffix} {
  trail: f32,
  head: f32,
}

fn evalDurationCometTrails_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  trailTime: f32,
  baseLength: f32,
  width: f32,
  bend: f32,
  durationGain: f32,
  center: vec2<f32>,
  onsetLoopStart: i32,
  onsetLoopEnd: i32,
) -> DurationCometTrailsResult_${suffix} {
  var trailMask: f32 = 0.0;
  var headMask: f32 = 0.0;
  let windowStart = timelineTime - trailTime;
  let loopStart = max(onsetLoopStart, 0);
  let loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_${suffix});

  for (var i: i32 = loopStart; i < loopEnd; i++) {
    if ((i - loopStart) >= ${maxLoop}) {
      break;
    }
    let onset = ARR_PATTERN_ONSETS_${suffix}[i];
    let startT = onset.x;
    let endT = onset.y;
    let pitch = onset.z;
    let velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) {
      continue;
    }

    let age = timelineTime - startT;
    if (age < 0.0 || age > trailTime) {
      continue;
    }

    let noteDuration = max(0.001, endT - startT);
    let trailLen = durationCometTrailLenWgsl(baseLength, noteDuration, durationGain);
    let angle = arrPattern_pitchToAngle(pitch);
    let dir = vec2<f32>(cos(angle), sin(angle));
    let perp = vec2<f32>(-dir.y, dir.x);
    let pitchNorm = durationCometPitchNormWgsl(pitch);
    let radius = pitchNorm * 0.42;
    let progress = arrPattern_saturate(age / noteDuration);
    let head = center + radius * dir + dir * progress * trailLen * 0.85;

    let stroke = durationCometSampleTrailWgsl(uv, head, dir, perp, trailLen, bend, width);
    let fade = exp(-age / max(trailTime, 0.001));
    let contrib = stroke * fade * velocity;
    trailMask = max(trailMask, contrib);

    let headFade = select(
      1.0,
      exp(-(timelineTime - endT) / max(trailTime * 0.35, 0.001)),
      timelineTime > endT + 0.05,
    );
    let glint = durationCometHeadGlintWgsl(uv, head, width) * headFade * velocity;
    headMask = max(headMask, glint);
  }

  return DurationCometTrailsResult_${suffix}(trailMask, headMask);
}`,
  ].join('\n\n');
}

const CHORD_VORONOI_BLOOM_WGSL_EVAL = String.raw`
fn chordVoronoiBloomUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

fn chordVoronoiReadPcEnergyWgsl_${'SUFFIX'}(binIndex: i32, pitchClass: i32) -> f32 {
  let base = binIndex * 3;
  let pc = pitchClass % 12;
  let row0 = ARR_PATTERN_PC_${'SUFFIX'}[base];
  let row1 = ARR_PATTERN_PC_${'SUFFIX'}[base + 1];
  let row2 = ARR_PATTERN_PC_${'SUFFIX'}[base + 2];
  if (pc < 4) {
    return row0[pc];
  }
  if (pc < 8) {
    return row1[pc - 4];
  }
  return row2[pc - 8];
}

fn chordVoronoiPcEnergyAtWgsl_${'SUFFIX'}(time: f32, release: f32, pitchClass: i32) -> f32 {
  if (ARR_PATTERN_BIN_COUNT_${'SUFFIX'} == 0) {
    return 0.0;
  }
  let rel = max(release, 0.001);
  let t0 = max(0.0, time - rel);
  let i0 = clamp(i32(floor(t0 / ARR_PATTERN_BIN_WIDTH_${'SUFFIX'})), 0, ARR_PATTERN_BIN_COUNT_${'SUFFIX'} - 1);
  let i1 = clamp(i32(floor(time / ARR_PATTERN_BIN_WIDTH_${'SUFFIX'})), 0, ARR_PATTERN_BIN_COUNT_${'SUFFIX'} - 1);
  var energy: f32 = 0.0;
  for (var i: i32 = i0; i <= i1; i++) {
    if (i - i0 >= ${MAX_PATTERN_RELEASE_BIN_LOOP}) {
      break;
    }
    let binCenter = (f32(i) + 0.5) * ARR_PATTERN_BIN_WIDTH_${'SUFFIX'};
    let age = time - binCenter;
    if (age < 0.0 || age > rel) {
      continue;
    }
    let decay = 1.0 - age / rel;
    let e = chordVoronoiReadPcEnergyWgsl_${'SUFFIX'}(i, pitchClass);
    energy = max(energy, e * decay);
  }
  return energy;
}

fn chordVoronoiSitePosWgsl_${'SUFFIX'}(pitchClass: i32, seed: f32, siteJitter: f32, center: vec2<f32>) -> vec2<f32> {
  let angle = f32(pitchClass) * arrPattern_tau() / 12.0 + seed * 0.17;
  let radius = 0.38;
  let base = center + vec2<f32>(cos(angle), sin(angle)) * radius;
  let jitSeed = vec2<f32>(f32(pitchClass) + seed * 13.0, seed * 7.0);
  let jitter = (vec2<f32>(arrPattern_hash22(jitSeed), arrPattern_hash11(seed + f32(pitchClass))) - vec2<f32>(0.5)) * siteJitter;
  return base + jitter;
}
`.trim();

/** Per-instance WGSL helper for `chord-voronoi-bloom` (bake tables + eval). */
export function buildChordVoronoiBloomWgslNodeHelper(
  nodeId: string,
  pack: NotePatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildNotePatternWgslBake(nodeId, pack);
  const evalWgsl = CHORD_VORONOI_BLOOM_WGSL_EVAL.replaceAll("'SUFFIX'", suffix);
  const maxSites = MAX_PATTERN_ACTIVE_SITES;
  return [
    bake,
    evalWgsl,
    `struct ChordVoronoiBloomResult_${suffix} {
  mask: f32,
  color: vec4<f32>,
}

fn evalChordVoronoiBloom_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  seed: f32,
  release: f32,
  edgeWidth: f32,
  siteJitter: f32,
  fill: f32,
  maxSites: f32,
  center: vec2<f32>,
) -> ChordVoronoiBloomResult_${suffix} {
  if (ARR_PATTERN_BIN_COUNT_${suffix} == 0) {
    return ChordVoronoiBloomResult_${suffix}(0.0, vec4<f32>(0.0));
  }

  var f1: f32 = 1e5;
  var f2: f32 = 1e5;
  var winnerPc: i32 = 0;
  var winnerEnergy: f32 = 0.0;
  var siteCount: i32 = 0;
  let maxSitesI = clamp(i32(maxSites), 1, ${maxSites});

  for (var pc: i32 = 0; pc < 12; pc++) {
    if (siteCount >= maxSitesI) {
      break;
    }
    let energy = chordVoronoiPcEnergyAtWgsl_${suffix}(timelineTime, release, pc);
    if (energy < 0.02) {
      continue;
    }
    siteCount++;
    let site = chordVoronoiSitePosWgsl_${suffix}(pc, seed, siteJitter, center);
    let wd = length(uv - site) / max(energy, 0.08);
    if (wd < f1) {
      f2 = f1;
      f1 = wd;
      winnerPc = pc;
      winnerEnergy = energy;
    } else if (wd < f2) {
      f2 = wd;
    }
  }

  if (siteCount == 0) {
    return ChordVoronoiBloomResult_${suffix}(0.0, vec4<f32>(0.0));
  }

  var edge: f32 = 0.0;
  if (siteCount >= 2) {
    edge = 1.0 - smoothstep(0.0, max(edgeWidth, 0.001), f2 - f1);
  }
  let fillCore = arrPattern_saturate(1.0 - f1 * (2.0 + fill * 6.0));
  let mask = max(edge * winnerEnergy, fillCore * fill * winnerEnergy);
  let rgb = arrPattern_pitchClassColor(f32(winnerPc));
  return ChordVoronoiBloomResult_${suffix}(mask, vec4<f32>(rgb, winnerEnergy));
}`,
  ].join('\n\n');
}

const NOTE_GRAVITY_WARP_WGSL_UV = String.raw`
fn noteGravityWarpUvFromPWgsl(p: vec2<f32>) -> vec2<f32> {
  let aspect = globals.v0.z / max(1.0, globals.v0.w);
  return vec2<f32>(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

fn noteGravityWarpPitchNormWgsl(pitch: f32, pitchLow: f32, pitchHigh: f32) -> f32 {
  return arrPattern_saturate((pitch - pitchLow) / max(pitchHigh - pitchLow, 1.0));
}

fn noteGravityWarpFadeWgsl(age: f32, windowSec: f32, decaySec: f32, decayCurve: i32, attack: f32) -> f32 {
  let decayDuration = select(windowSec, decaySec, decaySec > 0.0);
  let safeDecay = max(decayDuration, 0.001);
  let t = arrPattern_saturate(age / safeDecay);
  let fade = select(exp(-age / safeDecay), 1.0 - t, decayCurve == 1);
  let attackBoost = 1.0 + attack * exp(-age / max(safeDecay * 0.08, 0.001));
  return fade * attackBoost;
}

fn noteGravityWarpSpatialFalloffWgsl(dist: f32, reach: f32, falloffPower: f32) -> f32 {
  let n = dist / max(reach, 0.001);
  return pow(1.0 - smoothstep(0.0, 1.0, n), max(falloffPower, 0.01));
}
`.trim();

/** Per-instance WGSL helper for `note-gravity-warp` (bake tables + eval). */
export function buildNoteGravityWarpWgslNodeHelper(
  nodeId: string,
  pack: NotePatternPackResult
): string {
  const suffix = arrangementLanesGlslSuffix(nodeId);
  const bake = buildNotePatternWgslBake(nodeId, pack);
  const maxLoop = MAX_PATTERN_GRAVITY_ONSET_LOOP;
  return [
    bake,
    NOTE_GRAVITY_WARP_WGSL_UV,
    `struct NoteGravityWarpResult_${suffix} {
  warp: vec2<f32>,
  field: f32,
  energy: f32,
}

fn evalNoteGravityWarp_${suffix}(
  uv: vec2<f32>,
  timelineTime: f32,
  windowSec: f32,
  decaySec: f32,
  decayCurve: i32,
  attack: f32,
  strength: f32,
  reach: f32,
  swirl: f32,
  maxWarp: f32,
  falloffPower: f32,
  pitchSpread: f32,
  velGain: f32,
  blendMode: i32,
  fieldGamma: f32,
  pitchLow: f32,
  pitchHigh: f32,
  center: vec2<f32>,
  onsetLoopStart: i32,
  onsetLoopEnd: i32,
) -> NoteGravityWarpResult_${suffix} {
  var displacement = vec2<f32>(0.0, 0.0);
  var field: f32 = 0.0;
  var energy: f32 = 0.0;
  var bestWeight: f32 = 0.0;
  var activeCount: i32 = 0;
  let windowStart = timelineTime - windowSec;
  let loopStart = max(onsetLoopStart, 0);
  let loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_${suffix});

  for (var i: i32 = loopStart; i < loopEnd; i++) {
    if ((i - loopStart) >= ${maxLoop}) {
      break;
    }
    let onset = ARR_PATTERN_ONSETS_${suffix}[i];
    let startT = onset.x;
    let pitch = onset.z;
    let velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) {
      continue;
    }

    let age = timelineTime - startT;
    if (age < 0.0 || age > windowSec) {
      continue;
    }

    let angle = arrPattern_pitchToAngle(pitch);
    let pitchNorm = noteGravityWarpPitchNormWgsl(pitch, pitchLow, pitchHigh);
    let orbitRadius = pitchNorm * pitchSpread * 0.48;
    let attractor = center + orbitRadius * vec2<f32>(cos(angle), sin(angle));

    let delta = attractor - uv;
    let dist = length(delta);
    if (dist < 1e-5) {
      continue;
    }

    let radialDir = delta / dist;
    let tangentDir = vec2<f32>(-radialDir.y, radialDir.x);

    let spatial = noteGravityWarpSpatialFalloffWgsl(dist, reach, falloffPower);
    let fade = noteGravityWarpFadeWgsl(age, windowSec, decaySec, decayCurve, attack);
    let vel = clamp(velocity * velGain, 0.0, 1.0);
    let weight = vel * spatial * fade;

    let contrib = radialDir * strength * weight + tangentDir * strength * swirl * weight;

    if (blendMode == 1) {
      if (weight > bestWeight) {
        bestWeight = weight;
        displacement = contrib;
      }
    } else {
      displacement = displacement + contrib;
      activeCount = activeCount + 1;
    }

    field = max(field, weight);
    energy = min(1.0, energy + weight);
  }

  if (blendMode == 2 && activeCount > 0) {
    displacement = displacement / f32(activeCount);
  }

  displacement = arrPattern_clampLength(displacement, maxWarp);
  field = pow(arrPattern_saturate(field), max(fieldGamma, 0.01));
  energy = arrPattern_saturate(energy);

  return NoteGravityWarpResult_${suffix}(displacement, field, energy);
}`,
  ].join('\n\n');
}
