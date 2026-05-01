import { describe, it, expect } from 'vitest';
import { evaluateMixedWaveSignalPreview } from './mixedWaveSignalPreview';
import type { NodeInstance } from '../data-model/types';

describe('evaluateMixedWaveSignalPreview', () => {
  it('returns a finite value in a reasonable range for default params', () => {
    const node: NodeInstance = {
      id: 'n',
      type: 'mixed-wave-signal',
      position: { x: 0, y: 0 },
      parameters: {},
    };
    const v = evaluateMixedWaveSignalPreview(node);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(-1.05);
    expect(v).toBeLessThanOrEqual(1.05);
  });
});
