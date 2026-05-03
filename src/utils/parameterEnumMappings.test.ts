import { describe, expect, it } from 'vitest';
import { getParameterEnumMappings } from './parameterEnumMappings';

describe('getParameterEnumMappings', () => {
  it('maps oscillator-2d layerCombine to merge mode labels', () => {
    const m = getParameterEnumMappings('oscillator-2d', 'layerCombine');
    expect(m).not.toBeNull();
    expect(m![0]).toBe('Sum');
    expect(m![1]).toBe('Normalized');
    expect(m![2]).toBe('Product');
    expect(m![3]).toBe('Max |·|');
  });
});
