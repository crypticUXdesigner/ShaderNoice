import { describe, it, expect } from 'vitest';
import { canConvertShaderPortTypes } from './shaderPortTypes';

describe('canConvertShaderPortTypes', () => {
  it('treats any as compatible with concrete types', () => {
    expect(canConvertShaderPortTypes('vec3', 'any')).toBe(true);
    expect(canConvertShaderPortTypes('any', 'vec3')).toBe(true);
    expect(canConvertShaderPortTypes('any', 'any')).toBe(true);
  });

  it('still allows float/vec promotion', () => {
    expect(canConvertShaderPortTypes('float', 'vec3')).toBe(true);
    expect(canConvertShaderPortTypes('vec3', 'float')).toBe(true);
  });
});
