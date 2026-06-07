import { describe, it, expect } from 'vitest';
import {
  clampRemapOutput,
  clampToStoredChannelBounds,
  remapOutputClampBounds,
  remapValue,
} from './remapValue';

describe('remapValue', () => {
  it('maps across input range to output range with clamp', () => {
    expect(remapValue(0.5, 0, 1, 0, 10)).toBe(5);
    expect(remapValue(2, 0, 1, 0, 10)).toBe(10);
    expect(remapValue(-1, 0, 1, 0, 10)).toBe(0);
  });

  it('returns midpoint when value is nullish', () => {
    expect(remapValue(null, 0, 1, 0, 10)).toBe(5);
    expect(remapValue(undefined, 0, 1, -1, 1)).toBe(0);
  });

  it('treats zero input range as normalized 0', () => {
    expect(remapValue(0.5, 1, 1, 0, 10)).toBe(0);
  });

  it('supports inverted output range (outMin > outMax)', () => {
    expect(remapValue(0, 0, 1, -0.5, -1.6)).toBe(-0.5);
    expect(remapValue(1, 0, 1, -0.5, -1.6)).toBe(-1.6);
    expect(remapValue(0.5, 0, 1, -0.5, -1.6)).toBeCloseTo(-1.05, 5);
  });
});

describe('remapOutputClampBounds', () => {
  it('orders bounds when outMin > outMax', () => {
    expect(remapOutputClampBounds(-0.5, -1.6)).toEqual({ min: -1.6, max: -0.5 });
  });
});

describe('clampRemapOutput', () => {
  it('clamps inverted-range remaps without collapsing toward outMin', () => {
    expect(clampRemapOutput(-1.466, -0.5, -1.6)).toBe(-1.466);
    expect(clampRemapOutput(-2, -0.5, -1.6)).toBe(-1.6);
    expect(clampRemapOutput(0, -0.5, -1.6)).toBe(-0.5);
  });
});

describe('clampToStoredChannelBounds', () => {
  it('tolerates legacy inverted channel metadata', () => {
    expect(clampToStoredChannelBounds(-1.466, -0.5, -1.6)).toBe(-1.466);
  });
});
