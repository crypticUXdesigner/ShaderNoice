import { describe, expect, it } from 'vitest';

import { buildAnalysisChannels } from './audioAnalysisBuildCore';



describe('buildAnalysisChannels', () => {

  it('remapperOut channel stores gated 0–1 (Out lives on connection)', () => {

    const channels = buildAnalysisChannels(

      [],

      [{ id: 'r1', bandId: 'b1', inMin: 0, inMax: 1 }]

    );

    const remapperOut = channels.find((c) => c.kind === 'remapperOut');

    expect(remapperOut?.min).toBe(0);

    expect(remapperOut?.max).toBe(1);

    expect(remapperOut?.defaultValue).toBe(0);

  });



  it('uses bandRemap out range for remap channel bounds', () => {

    const channels = buildAnalysisChannels(

      [

        {

          nodeId: 'band-1',

          frequencyBands: [{ minHz: 0, maxHz: 200 }],

          bandModes: ['mean'],

          spectrumFftSize: 4096,

          mappingFftSize: 2048,

          bandRemap: [{ inMin: 0, inMax: 1, outMin: -0.5, outMax: 4 }],

        },

      ],

      []

    );

    const remap = channels.find((c) => c.kind === 'remap');

    expect(remap?.min).toBe(-0.5);

    expect(remap?.max).toBe(4);

  });

});

