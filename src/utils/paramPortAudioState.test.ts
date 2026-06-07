import { describe, expect, it } from 'vitest';
import type { NodeGraph } from '../data-model/types';
import type { AudioSetup } from '../data-model/audioSetupTypes';
import {
  addMidiEnvelopeBinding,
  updateMidiEnvelopeRemapper,
} from '../data-model/immutableUpdatesMidiEnvelope';
import { defaultRemapperIdForPreset } from '../data-model/midiEnvelopeRemapperMigration';
import {
  getParamPortDriverCellLabel,
  getParamPortConnectionState,
  resolveParamPortDriverCellDisplay,
} from './paramPortAudioState';
import { resetMidiEnvelopeFrameCacheForTests } from './midiEnvelopeFrameCache';
import type { ArrangementNote, ArrangementSnapshot } from '../audiotool/arrangement/types';

const audioSetup: AudioSetup = {
  files: [],
  bands: [{ id: 'band-1', name: 'Bass', fileId: 'f1', frequencyBands: [[20, 200]] }],
  remappers: [
    {
      id: 'remap-1',
      name: 'Kick drive',
      bandId: 'band-1',
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 1,
    },
  ],
};

function baseGraph(): NodeGraph {
  return {
    nodes: [{ id: 'n1', type: 'float-test', parameters: { amount: 0.5 }, position: { x: 0, y: 0 } }],
    connections: [],
    viewState: { pan: { x: 0, y: 0 }, zoom: 1 },
  };
}

function note(startSeconds: number, trackId = 'track-1'): ArrangementNote {
  return {
    id: 'n1',
    collectionId: 'col',
    trackId,
    startSeconds,
    durationSeconds: 0.5,
    pitch: 60,
    velocity: 1,
  };
}

function minimalSnapshot(notes: ArrangementNote[]): ArrangementSnapshot {
  return {
    tracks: [{ id: 'track-1', kind: 'note', orderAmongTracks: 0, enabled: true }],
    regions: [],
    notes,
    bpm: 120,
    durationSeconds: 60,
    timeSignature: { numerator: 4, denominator: 4 },
    source: { trackName: 'tracks/t1', projectName: 'projects/p1', commitIndex: 0 },
  };
}

describe('getParamPortDriverCellLabel', () => {
  it('returns audio remapper name when virtually connected', () => {
    const graph: NodeGraph = {
      ...baseGraph(),
      connections: [
        {
          id: 'c1',
          sourceNodeId: 'audio-signal:remap-remap-1',
          targetNodeId: 'n1',
          targetParameter: 'amount',
        },
      ],
    };
    expect(getParamPortConnectionState('n1', 'amount', graph, audioSetup).signalName).toBe(
      'Bass: Kick drive'
    );
    expect(getParamPortDriverCellLabel('n1', 'amount', graph, audioSetup)).toBe('Bass: Kick drive');
  });

  it('returns MIDI remapper name when envelope binding is present', () => {
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', { presetId: 'preset-1' });
    graph = updateMidiEnvelopeRemapper(graph, defaultRemapperIdForPreset('preset-1'), {
      name: 'Snare hit',
    });
    expect(getParamPortDriverCellLabel('n1', 'amount', graph, audioSetup)).toBe('Snare hit');
  });
});

describe('resolveParamPortDriverCellDisplay', () => {
  it('returns MIDI driver cell with envelope meter when snapshot is present', () => {
    resetMidiEnvelopeFrameCacheForTests();
    let graph = addMidiEnvelopeBinding(baseGraph(), 'n1', 'amount', {
      presetId: 'preset-1',
      trackIds: ['track-1'],
      envelope: {
        adsr: { attackSeconds: 0, decaySeconds: 0, sustainLevel: 1, releaseSeconds: 0.2 },
      },
    });
    graph = updateMidiEnvelopeRemapper(graph, defaultRemapperIdForPreset('preset-1'), {
      name: 'Hat gate',
    });
    const setup: AudioSetup = {
      ...audioSetup,
      arrangementSnapshot: minimalSnapshot([note(1)]),
    };
    const display = resolveParamPortDriverCellDisplay('n1', 'amount', graph, setup, {
      transportTime: 1,
      snapshot: setup.arrangementSnapshot,
    });
    expect(display?.kind).toBe('midi');
    expect(display?.label).toBe('Hat gate');
    expect(display?.meterAriaLabel).toBe('MIDI envelope level');
    expect(display?.meterLevel).toBeGreaterThan(0);
  });

  it('returns null when no audio or MIDI driver is attached', () => {
    expect(resolveParamPortDriverCellDisplay('n1', 'amount', baseGraph(), audioSetup)).toBeNull();
  });
});
