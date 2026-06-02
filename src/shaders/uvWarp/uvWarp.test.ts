import { describe, it, expect } from 'vitest';
import {
  circleInversionUv,
  emitCircleInversionGlsl,
  emitCircleInversionWgsl,
  hashCell,
  voronoiCellLookup,
  emitVoronoiCellGlsl,
  emitVoronoiCellWgsl,
} from './index';

describe('circleInversionUv', () => {
  it('maps a point at 2r from center to r/2 (full strength)', () => {
    const center: [number, number] = [0.2, -0.1];
    const radius = 0.35;
    const z: [number, number] = [center[0] + 2 * radius, center[1]];
    const [wx, wy] = circleInversionUv(z, center, radius, 1);

    expect(wx - center[0]).toBeCloseTo(radius / 2, 5);
    expect(wy - center[1]).toBeCloseTo(0, 5);
  });

  it('returns input unchanged when strength is zero', () => {
    const z: [number, number] = [0.5, -0.25];
    const center: [number, number] = [0, 0];
    expect(circleInversionUv(z, center, 0.4, 0)).toEqual(z);
  });

  it('stays finite at the pole (center)', () => {
    const center: [number, number] = [0.1, 0.2];
    const [wx, wy] = circleInversionUv(center, center, 0.35, 1);
    expect(Number.isFinite(wx)).toBe(true);
    expect(Number.isFinite(wy)).toBe(true);
  });
});

describe('voronoiCellLookup', () => {
  it('returns the same cell id for two nearby interior samples', () => {
    const scale = 4;
    const jitter = 1;
    const a = voronoiCellLookup([0.12, 0.18], scale, jitter);
    const b = voronoiCellLookup([0.121, 0.181], scale, jitter);

    expect(a.cellId).toEqual(b.cellId);
    expect(a.f1).toBeLessThan(a.f2);
    expect(a.f1).toBeGreaterThan(0);
  });

  it('hashCell is stable for a fixed cell id', () => {
    const cellId: [number, number] = [3, -2];
    expect(hashCell(cellId)).toEqual(hashCell(cellId));
    const [hx, hy] = hashCell(cellId);
    expect(hx).toBeGreaterThanOrEqual(0);
    expect(hx).toBeLessThan(1);
    expect(hy).toBeGreaterThanOrEqual(0);
    expect(hy).toBeLessThan(1);
  });
});

describe('shader emitters', () => {
  it('circle inversion GLSL/WGSL emitters include guarded inversion', () => {
    const glsl = emitCircleInversionGlsl();
    const wgsl = emitCircleInversionWgsl();
    expect(glsl).toContain('uvWarp_circleInversionUv');
    expect(glsl).toContain('max(dot(p, p), 0.0001)');
    expect(wgsl).toContain('fn uvWarp_circleInversionUv');
    expect(wgsl).toContain('max(dot(p, p), 0.0001)');
  });

  it('voronoi cell GLSL/WGSL emitters include lookup and hashCell', () => {
    const glsl = emitVoronoiCellGlsl();
    const wgsl = emitVoronoiCellWgsl();
    expect(glsl).toContain('struct UvWarpVoronoiCell');
    expect(glsl).toContain('uvWarp_voronoiCellLookup');
    expect(glsl).toContain('uvWarp_hashCell');
    expect(wgsl).toContain('struct UvWarpVoronoiCell');
    expect(wgsl).toContain('fn uvWarp_voronoiCellLookup');
    expect(wgsl).toContain('fn uvWarp_hashCell');
  });
});
