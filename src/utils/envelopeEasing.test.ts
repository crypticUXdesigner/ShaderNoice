import { describe, expect, it } from 'vitest';
import { applyEnvelopeCurve, buildEnvelopeCurveIconPathD } from './envelopeEasing';

describe('envelopeEasing', () => {
  it('linear is identity', () => {
    expect(applyEnvelopeCurve(0, 'linear')).toBe(0);
    expect(applyEnvelopeCurve(0.5, 'linear')).toBe(0.5);
    expect(applyEnvelopeCurve(1, 'linear')).toBe(1);
  });

  it('exponential is concave (below linear at mid)', () => {
    expect(applyEnvelopeCurve(0.5, 'exponential')).toBeLessThan(0.5);
  });

  it('logarithmic is convex (above linear at mid)', () => {
    expect(applyEnvelopeCurve(0.5, 'logarithmic')).toBeGreaterThan(0.5);
  });

  it('smooth is smoothstep with zero endpoints', () => {
    expect(applyEnvelopeCurve(0, 'smooth')).toBe(0);
    expect(applyEnvelopeCurve(1, 'smooth')).toBe(1);
    expect(applyEnvelopeCurve(0.5, 'smooth')).toBe(0.5);
  });

  it('clamps out-of-range t', () => {
    expect(applyEnvelopeCurve(-0.2, 'exponential')).toBe(0);
    expect(applyEnvelopeCurve(1.5, 'logarithmic')).toBe(1);
  });

  it('buildEnvelopeCurveIconPathD produces distinct non-empty paths', () => {
    const linear = buildEnvelopeCurveIconPathD('linear');
    const exponential = buildEnvelopeCurveIconPathD('exponential');
    const logarithmic = buildEnvelopeCurveIconPathD('logarithmic');
    const smooth = buildEnvelopeCurveIconPathD('smooth');

    for (const path of [linear, exponential, logarithmic, smooth]) {
      expect(path.startsWith('M')).toBe(true);
      expect(path.length).toBeGreaterThan(10);
    }
    expect(exponential).not.toBe(logarithmic);
    expect(exponential).not.toBe(smooth);
    expect(logarithmic).not.toBe(smooth);
  });
});
