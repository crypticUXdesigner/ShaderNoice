import { describe, expect, it } from 'vitest';
import { applyDriverRemap } from '../../utils/driverRemap';
import { getPanelBandLiveValues, getVirtualNodeLiveValue } from './audioLiveValues';
import type { AnalyzerNodeState } from './FrequencyAnalyzer';

describe('getPanelBandLiveValues', () => {
  it('outgoing uses full asymmetric out range for needles', () => {
    const getAnalyzerNodeState = (): AnalyzerNodeState =>
      ({ smoothedBandValues: [0.5] }) as AnalyzerNodeState;

    const { incoming, outgoing } = getPanelBandLiveValues(
      'band-1',
      { inMin: 0, inMax: 1, outMin: -0.5, outMax: 4 },
      getAnalyzerNodeState
    );

    expect(incoming).toBe(0.5);
    expect(outgoing).toBe(applyDriverRemap(0.5, 0, 1, -0.5, 4));
    expect(outgoing).toBeCloseTo(1.75, 6);
  });
});

describe('getVirtualNodeLiveValue', () => {
  it('remap virtual node returns gated 0–1 (Out lives on connection)', () => {
    const audioSetup = {
      files: [],
      bands: [],
      remappers: [
        {
          id: 'r1',
          name: 'R1',
          bandId: 'band-1',
          inMin: 0,
          inMax: 1,
        },
      ],
    };
    const getAnalyzerNodeState = (): AnalyzerNodeState =>
      ({ smoothedBandValues: [1] }) as AnalyzerNodeState;

    expect(getVirtualNodeLiveValue('audio-signal:remap-r1', audioSetup, getAnalyzerNodeState)).toBe(1);
  });
});
