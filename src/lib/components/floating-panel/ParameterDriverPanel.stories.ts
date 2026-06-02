import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ParameterDriverPanel.svelte';
import type { NodeGraph } from '../../../data-model/types';
import type { AudioSetup } from '../../../data-model/audioSetupTypes';
import type { ArrangementSnapshot } from '../../../audiotool/arrangement/types';
import { addMidiEnvelopeBinding } from '../../../data-model/immutableUpdatesMidiEnvelope';

const graph: NodeGraph = {
  id: 'graph-story',
  name: 'Story',
  version: '2.0',
  nodes: [{ id: 'node-1', type: 'color-gradient', parameters: {}, position: { x: 0, y: 0 } }],
  connections: [],
  viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
};

const audioSetup: AudioSetup = { files: [], bands: [], remappers: [] };

const arrangementSnapshot: ArrangementSnapshot = {
  tracks: [
    { id: 'track-drums', kind: 'note', orderAmongTracks: 0, enabled: true, label: 'Drums' },
    { id: 'track-bass', kind: 'note', orderAmongTracks: 1, enabled: true, label: 'Bass' },
  ],
  regions: [],
  notes: [
    { id: 'n1', collectionId: 'c1', trackId: 'track-drums', startSeconds: 0, durationSeconds: 0.5, pitch: 60, velocity: 0.8 },
    { id: 'n2', collectionId: 'c1', trackId: 'track-bass', startSeconds: 1, durationSeconds: 0.25, pitch: 48, velocity: 0.6 },
  ],
  bpm: 120,
  durationSeconds: 60,
  timeSignature: { numerator: 4, denominator: 4 },
  source: { trackName: 'tracks/t', projectName: 'projects/p', commitIndex: 1 },
};

const audioSetupWithArrangement: AudioSetup = {
  ...audioSetup,
  arrangementSnapshot,
};

const graphWithMidi = addMidiEnvelopeBinding(graph, 'node-1', 'amount', {
  trackIds: ['track-drums'],
});

const graphWithAnimation: NodeGraph = {
  ...graph,
  automation: {
    bpm: 120,
    durationSeconds: 60,
    lanes: [
      {
        id: 'lane-1',
        nodeId: 'node-1',
        paramName: 'amount',
        regions: [
          {
            id: 'region-1',
            startTime: 0,
            duration: 60,
            loop: false,
            curve: {
              keyframes: [
                { time: 0, value: 0.5 },
                { time: 1, value: 0.5 },
              ],
              interpolation: 'linear',
            },
          },
        ],
      },
    ],
  },
};

const meta = {
  title: 'ShaderNoice/floating-panel/ParameterDriverPanel',
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Add mode — audio kind selected by default. */
export const AddMode: Story = {
  args: {
    open: true,
    x: 480,
    y: 360,
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph,
    audioSetup,
    nodeSpecs: new Map(),
    onSelect: () => {},
    onClose: () => {},
    onAudioSetupChange: () => {},
    onGraphUpdate: () => {},
  },
};

/**
 * MIDI envelope kind with arrangement snapshot — envelope list + ADSR card editor.
 */
/** Focused mode — animation driver attached (compact curve editor). */
export const FocusedAnimation: Story = {
  args: {
    open: true,
    x: 480,
    y: 360,
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph: graphWithAnimation,
    audioSetup,
    nodeSpecs: new Map(),
    onSelect: () => {},
    onClose: () => {},
    onAudioSetupChange: () => {},
    onGraphUpdate: () => {},
  },
};

/**
 * MIDI envelope kind with arrangement snapshot — envelope list + ADSR card editor.
 */
export const MidiEnvelopeDriver: Story = {
  args: {
    open: true,
    x: 480,
    y: 360,
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph: graphWithMidi,
    audioSetup: audioSetupWithArrangement,
    nodeSpecs: new Map(),
    onSelect: () => {},
    onClose: () => {},
    onAudioSetupChange: () => {},
    onGraphUpdate: () => {},
  },
};

const graphWithUnboundMidi = addMidiEnvelopeBinding(graph, '', '', {
  trackIds: ['track-drums'],
});

/**
 * Overview — unbound MIDI envelope preset; **Connect** on the card (toolbar: New envelope only).
 * See also `ParameterDriverPanelUxV2.stories.ts` for v2 regression states.
 */
export const ConnectExistingMidiEnvelope: Story = {
  args: {
    open: true,
    x: 480,
    y: 360,
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph: graphWithUnboundMidi,
    audioSetup: audioSetupWithArrangement,
    nodeSpecs: new Map(),
    onSelect: () => {},
    onClose: () => {},
    onAudioSetupChange: () => {},
    onGraphUpdate: () => {},
  },
};
