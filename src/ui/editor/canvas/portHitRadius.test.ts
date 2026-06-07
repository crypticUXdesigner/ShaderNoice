import { describe, expect, it } from 'vitest';
import { screenHitRadiusToCanvas } from './portHitRadius';

describe('screenHitRadiusToCanvas', () => {
  it('returns screen radius at 100% zoom', () => {
    expect(screenHitRadiusToCanvas(22, 1)).toBe(22);
  });

  it('scales inversely with zoom so screen tolerance stays constant', () => {
    expect(screenHitRadiusToCanvas(24, 0.5)).toBe(48);
    expect(screenHitRadiusToCanvas(24, 0.25)).toBe(96);
  });

  it('guards invalid zoom and radius', () => {
    expect(screenHitRadiusToCanvas(22, 0)).toBe(22);
    expect(screenHitRadiusToCanvas(22, -1)).toBe(22);
    expect(screenHitRadiusToCanvas(0, 1)).toBe(0);
    expect(screenHitRadiusToCanvas(NaN, 1)).toBe(0);
  });
});
