import { describe, expect, it } from 'vitest';
import type { AudioBandMode } from '../../data-model/audioSetupTypes';
import { FrequencyAnalyzer } from './FrequencyAnalyzer';

type FakeAnalyserNode = {
  frequencyBinCount: number;
  getByteFrequencyData: (data: Uint8Array) => void;
};

function makeFakeAnalyserNode(spectrum: Uint8Array): FakeAnalyserNode {
  return {
    frequencyBinCount: spectrum.length,
    getByteFrequencyData(data: Uint8Array) {
      data.set(spectrum);
    },
  };
}

describe('FrequencyAnalyzer band extraction modes', () => {
  it('computes mean/max/rms over band bins and normalizes to 0..1', () => {
    const sampleRate = 48_000;
    const fftSize = 8;
    const spectrum = new Uint8Array([10, 20, 30, 40]); // bins 0..3 (fftSize/2)
    const analyserNode = makeFakeAnalyserNode(spectrum) as unknown as AnalyserNode;

    const analyzer = new FrequencyAnalyzer({ getSampleRate: () => sampleRate } as any);
    const audioNodeStates = new Map<string, any>([
      [
        'f1',
        {
          analyserNode,
          frequencyData: new Uint8Array(spectrum.length),
        },
      ],
    ]);

    const band = { minHz: 0, maxHz: (3 / fftSize) * sampleRate };
    const bandModes = ['mean'] satisfies AudioBandMode[];
    const state = analyzer.createAnalyzer(
      'band-1',
      'f1',
      [band],
      [...bandModes],
      [0],
      undefined,
      undefined,
      fftSize,
      audioNodeStates.get('f1')
    );

    const previous = new Map<string, number>();
    analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    const meanUpdates = analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    expect(meanUpdates).toHaveLength(1);
    expect(meanUpdates[0]).toMatchObject({ nodeId: 'band-1', paramName: 'band' });
    const expectedMean01 = ((10 + 20 + 30 + 40) / 4) / 255;
    expect(meanUpdates[0]!.value).toBeCloseTo(expectedMean01, 6);

    state.bandModes[0] = 'max';
    analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    const maxUpdates = analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    const expectedMax01 = 40 / 255;
    expect(maxUpdates[0]!.value).toBeCloseTo(expectedMax01, 6);

    state.bandModes[0] = 'rms';
    analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    const rmsUpdates = analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    const expectedRms01 = Math.sqrt((10 * 10 + 20 * 20 + 30 * 30 + 40 * 40) / 4) / 255;
    expect(rmsUpdates[0]!.value).toBeCloseTo(expectedRms01, 6);
  });

  it('reuses the uniform-updates scratch array across consecutive updateFrequencyAnalysis calls', () => {
    const sampleRate = 48_000;
    const fftSize = 8;
    const spectrum = new Uint8Array([10, 20, 30, 40]);
    const analyserNode = makeFakeAnalyserNode(spectrum) as unknown as AnalyserNode;

    const analyzer = new FrequencyAnalyzer({ getSampleRate: () => sampleRate } as any);
    const audioNodeStates = new Map<string, any>([
      [
        'f1',
        {
          analyserNode,
          frequencyData: new Uint8Array(spectrum.length),
        },
      ],
    ]);

    const band = { minHz: 0, maxHz: (3 / fftSize) * sampleRate };
    analyzer.createAnalyzer(
      'band-1',
      'f1',
      [band],
      ['mean'],
      [0],
      undefined,
      undefined,
      fftSize,
      audioNodeStates.get('f1')
    );

    const previous = new Map<string, number>();
    const a = analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    const b = analyzer.updateFrequencyAnalysis(audioNodeStates, null, previous, 0.00001, true);
    expect(a).toBe(b);
    expect(a).toHaveLength(1);
  });

  it('indexes audioFile connections by target+port (first match wins; rebuilds on graph identity change)', () => {
    const sampleRate = 48_000;
    const fftSize = 8;
    const spectrum = new Uint8Array([10, 20, 30, 40]);
    const analyserF1 = makeFakeAnalyserNode(spectrum) as unknown as AnalyserNode;
    const analyserF2 = makeFakeAnalyserNode(new Uint8Array([50, 60, 70, 80])) as unknown as AnalyserNode;

    const analyzer = new FrequencyAnalyzer({ getSampleRate: () => sampleRate } as any);
    const audioNodeStates = new Map<string, any>([
      ['f1', { analyserNode: analyserF1, frequencyData: new Uint8Array(spectrum.length) }],
      ['f2', { analyserNode: analyserF2, frequencyData: new Uint8Array(4) }],
    ]);

    const band = { minHz: 0, maxHz: (3 / fftSize) * sampleRate };
    // Analyzer shares f1's analyser so fallback path would pick f1; graph should override to f2.
    analyzer.createAnalyzer(
      'band-1',
      'f1',
      [band],
      ['mean'],
      [0],
      undefined,
      undefined,
      fftSize,
      audioNodeStates.get('f1')
    );

    const graphA = {
      connections: [
        { sourceNodeId: 'f2', targetNodeId: 'band-1', targetPort: 'audioFile' },
        { sourceNodeId: 'f1', targetNodeId: 'band-1', targetPort: 'audioFile' },
      ],
    };
    const previous = new Map<string, number>();
    analyzer.updateFrequencyAnalysis(audioNodeStates, graphA, previous, 0.00001, true);
    expect(analyzer.getConnectionIndexGraphForTests()).toBe(graphA);
    expect(analyzer.getIndexedSourceForTests('band-1', 'audioFile')).toBe('f2');

    const updatesFromF2 = analyzer.updateFrequencyAnalysis(audioNodeStates, graphA, previous, 0.00001, true);
    const expectedF2Mean = ((50 + 60 + 70 + 80) / 4) / 255;
    expect(updatesFromF2[0]!.value).toBeCloseTo(expectedF2Mean, 6);
    // Same graph identity: index not rebuilt to a new Map object identity check via getConnectionIndexGraphForTests.
    expect(analyzer.getConnectionIndexGraphForTests()).toBe(graphA);

    const graphB = {
      connections: [{ sourceNodeId: 'f1', targetNodeId: 'band-1', targetPort: 'audioFile' }],
    };
    analyzer.updateFrequencyAnalysis(audioNodeStates, graphB, previous, 0.00001, true);
    expect(analyzer.getConnectionIndexGraphForTests()).toBe(graphB);
    expect(analyzer.getIndexedSourceForTests('band-1', 'audioFile')).toBe('f1');
  });
});

