const ARR_PATTERN_HELPERS_GLSL = `

const float ARR_PATTERN_TAU = 6.28318530718;



float arrPatternSaturate(float x) {

  return clamp(x, 0.0, 1.0);

}



float arrPatternTau() {

  return ARR_PATTERN_TAU;

}



float arrPatternHash11(float p) {

  p = fract(p * 0.1031);

  p *= p + 33.33;

  p *= p + p;

  return fract(p);

}



float arrPatternHash22(vec2 p) {

  vec3 p3 = fract(vec3(p.xyx) * 0.1031);

  p3 += dot(p3, p3.yzx + 33.33);

  return fract((p3.x + p3.y) * p3.z);

}



vec2 arrPatternClampLength(vec2 v, float maxLen) {

  float len = length(v);

  if (len <= maxLen) return v;

  return v * (maxLen / max(len, 1e-6));

}



float arrPatternPitchToAngle(float pitch) {

  float pc = mod(floor(pitch + 0.5), 12.0);

  return pc * ARR_PATTERN_TAU / 12.0;

}



int arrPatternPitchToSector(float pitch, int sectorCount) {

  int sc = clamp(sectorCount, 2, 24);

  int pc = int(mod(floor(pitch + 0.5), 12.0));

  return int(floor(float(pc) * float(sc) / 12.0)) % sc;

}



float arrPatternPitchClassForSector(float sectorIndex, float sectorCount) {

  float sc = max(2.0, min(24.0, sectorCount));

  return (sectorIndex + 0.5) * 12.0 / sc;

}



vec3 arrPatternPitchClassColor(float pitchClass) {

  float hue = fract(pitchClass / 12.0 + 0.08);

  return vec3(

    0.55 + 0.45 * cos(ARR_PATTERN_TAU * (hue + 0.0)),

    0.55 + 0.45 * cos(ARR_PATTERN_TAU * (hue + 0.33)),

    0.55 + 0.45 * cos(ARR_PATTERN_TAU * (hue + 0.66))

  );

}



float arrPatternTrackOrderNorm(float trackIndex, float trackCount) {

  return trackCount <= 1.0 ? 0.0 : trackIndex / max(1.0, trackCount - 1.0);

}

`.trim();



const ARR_PATTERN_HELPERS_WGSL = `

const ARR_PATTERN_TAU: f32 = 6.28318530718;



fn arrPattern_saturate(x: f32) -> f32 {

  return clamp(x, 0.0, 1.0);

}



fn arrPattern_tau() -> f32 {

  return ARR_PATTERN_TAU;

}



fn arrPattern_hash11(p: f32) -> f32 {

  var q = fract(p * 0.1031);

  q = q * (q + 33.33);

  q = q * (q + q);

  return fract(q);

}



fn arrPattern_hash22(p: vec2<f32>) -> f32 {

  var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);

  p3 = p3 + dot(p3, p3.yzx + vec3<f32>(33.33));

  return fract((p3.x + p3.y) * p3.z);

}



fn arrPattern_clampLength(v: vec2<f32>, maxLen: f32) -> vec2<f32> {

  let len = length(v);

  if (len <= maxLen) {

    return v;

  }

  return v * (maxLen / max(len, 1e-6));

}



fn arrPattern_pitchToAngle(pitch: f32) -> f32 {

  let pc = floor(pitch + 0.5) % 12.0;

  return pc * ARR_PATTERN_TAU / 12.0;

}



fn arrPattern_pitchToSector(pitch: f32, sectorCount: i32) -> i32 {

  let sc = clamp(sectorCount, 2, 24);

  let pc = i32(floor(pitch + 0.5) % 12.0);

  return i32(floor(f32(pc) * f32(sc) / 12.0)) % sc;

}



fn arrPattern_pitchClassForSector(sectorIndex: f32, sectorCount: f32) -> f32 {

  let sc = clamp(sectorCount, 2.0, 24.0);

  return (sectorIndex + 0.5) * 12.0 / sc;

}



fn arrPattern_pitchClassColor(pitchClass: f32) -> vec3<f32> {

  let hue = fract(pitchClass / 12.0 + 0.08);

  return vec3<f32>(

    0.55 + 0.45 * cos(ARR_PATTERN_TAU * (hue + 0.0)),

    0.55 + 0.45 * cos(ARR_PATTERN_TAU * (hue + 0.33)),

    0.55 + 0.45 * cos(ARR_PATTERN_TAU * (hue + 0.66))

  );

}



fn arrPattern_trackOrderNorm(trackIndex: f32, trackCount: f32) -> f32 {

  if (trackCount <= 1.0) {

    return 0.0;

  }

  return trackIndex / max(1.0, trackCount - 1.0);

}

`.trim();



/** Shared GLSL helpers for arrangement pattern nodes (hash, pitch angle, track norm, …). */

export function emitArrangementPatternHelpersGlsl(): string {

  return ARR_PATTERN_HELPERS_GLSL;

}



/** Shared WGSL helpers — `arrPattern_` prefix for global uniqueness. */

export function emitArrangementPatternHelpersWgsl(): string {

  return ARR_PATTERN_HELPERS_WGSL;

}



export function registerArrangementPatternSharedWgslHelpers(

  requireHelper: (id: string, wgsl: string) => void

): void {

  requireHelper('arrangement-pattern-shared', emitArrangementPatternHelpersWgsl());

}


