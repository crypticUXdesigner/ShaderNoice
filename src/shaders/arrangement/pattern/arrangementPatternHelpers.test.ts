import { describe, it, expect } from 'vitest';
import {
  emitArrangementPatternHelpersGlsl,
  emitArrangementPatternHelpersWgsl,
  registerArrangementPatternSharedWgslHelpers,
} from './arrangementPatternHelpersGlsl';

describe('arrangementPatternHelpers', () => {
  it('emitArrangementPatternHelpersGlsl includes expected function signatures', () => {
    const glsl = emitArrangementPatternHelpersGlsl();
    expect(glsl).toContain('float arrPatternSaturate(float x)');
    expect(glsl).toContain('float arrPatternTau()');
    expect(glsl).toContain('float arrPatternHash11(float p)');
    expect(glsl).toContain('float arrPatternHash22(vec2 p)');
    expect(glsl).toContain('vec2 arrPatternClampLength(vec2 v, float maxLen)');
    expect(glsl).toContain('float arrPatternPitchToAngle(float pitch)');
    expect(glsl).toContain('int arrPatternPitchToSector(float pitch, int sectorCount)');
    expect(glsl).toContain('float arrPatternPitchClassForSector(float sectorIndex, float sectorCount)');
    expect(glsl).toContain('vec3 arrPatternPitchClassColor(float pitchClass)');
    expect(glsl).toContain('float arrPatternTrackOrderNorm(float trackIndex, float trackCount)');
    expect(glsl).toContain('const float ARR_PATTERN_TAU');
  });

  it('emitArrangementPatternHelpersWgsl includes arrPattern_ prefixed helpers', () => {
    const wgsl = emitArrangementPatternHelpersWgsl();
    expect(wgsl).toContain('fn arrPattern_saturate(x: f32) -> f32');
    expect(wgsl).toContain('fn arrPattern_tau() -> f32');
    expect(wgsl).toContain('fn arrPattern_hash11(p: f32) -> f32');
    expect(wgsl).toContain('fn arrPattern_hash22(p: vec2<f32>) -> f32');
    expect(wgsl).toContain('fn arrPattern_clampLength(v: vec2<f32>, maxLen: f32) -> vec2<f32>');
    expect(wgsl).toContain('fn arrPattern_pitchToAngle(pitch: f32) -> f32');
    expect(wgsl).toContain('fn arrPattern_pitchToSector(pitch: f32, sectorCount: i32) -> i32');
    expect(wgsl).toContain('fn arrPattern_pitchClassForSector(sectorIndex: f32, sectorCount: f32) -> f32');
    expect(wgsl).toContain('fn arrPattern_pitchClassColor(pitchClass: f32) -> vec3<f32>');
    expect(wgsl).toContain('fn arrPattern_trackOrderNorm(trackIndex: f32, trackCount: f32) -> f32');
  });

  it('registerArrangementPatternSharedWgslHelpers deduplicates by helper id', () => {
    const seen = new Map<string, string>();
    const requireHelper = (id: string, body: string) => {
      if (!seen.has(id)) seen.set(id, body);
    };
    registerArrangementPatternSharedWgslHelpers(requireHelper);
    registerArrangementPatternSharedWgslHelpers(requireHelper);
    expect(seen.size).toBe(1);
    expect(seen.get('arrangement-pattern-shared')).toContain('arrPattern_saturate');
  });
});
