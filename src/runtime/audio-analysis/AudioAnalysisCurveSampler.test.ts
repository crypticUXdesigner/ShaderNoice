import { describe, expect, it } from 'vitest';
import { AudioAnalysisCurveSampler } from './AudioAnalysisCurveSampler';

describe('AudioAnalysisCurveSampler', () => {
  it('samples inverted remapper output without legacy min/max clamp collapse', () => {
    const cache = {
      startTimeSeconds: 0,
      hopSeconds: 1 / 120,
      frameCount: 2,
      channels: [
        {
          nodeId: 'remap-r1',
          paramName: 'out',
          min: -0.5,
          max: -1.6,
          defaultValue: -0.5,
        },
      ],
      values: new Float32Array([-1.466, -1.466]),
    };

    const sampler = new AudioAnalysisCurveSampler(cache);
    const updates = sampler.getUniformUpdatesAtTime(0);
    expect(updates[0]?.value).toBeCloseTo(-1.466, 5);
  });
});
