/**
 * Parameter driver panel UX v2 — overview layout, connect-on-card, shared empty states.
 * Visual regression contract for post–parameter-drivers-v1 polish.
 */
import type { Meta, StoryObj } from '@storybook/svelte-vite';
import ParameterDriverPanel from './ParameterDriverPanel.svelte';
import AudioDriverPanelContent from './AudioDriverPanelContent.svelte';
import MidiDriverPanelContent from './MidiDriverPanelContent.svelte';
import AnimationDriverPanelContent from './AnimationDriverPanelContent.svelte';
import type { NodeGraph } from '../../../data-model/types';
import type { AudioSetup } from '../../../data-model/audioSetupTypes';
import type { ArrangementSnapshot } from '../../../audiotool/arrangement/types';
import { addMidiEnvelopeBinding } from '../../../data-model/immutableUpdatesMidiEnvelope';

const graph: NodeGraph = {
  id: 'graph-ux-v2',
  name: 'Story',
  version: '2.0',
  nodes: [{ id: 'node-1', type: 'color-gradient', parameters: {}, position: { x: 0, y: 0 } }],
  connections: [],
  viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
};

const arrangementSnapshot: ArrangementSnapshot = {
  tracks: [
    { id: 'track-drums', kind: 'note', orderAmongTracks: 0, enabled: true, label: 'Drums' },
    { id: 'track-bass', kind: 'note', orderAmongTracks: 1, enabled: true, label: 'Bass' },
  ],
  regions: [],
  notes: [
    {
      id: 'n1',
      collectionId: 'c1',
      trackId: 'track-drums',
      startSeconds: 0,
      durationSeconds: 0.5,
      pitch: 60,
      velocity: 0.8,
    },
  ],
  bpm: 120,
  durationSeconds: 60,
  timeSignature: { numerator: 4, denominator: 4 },
  source: { trackName: 'tracks/t', projectName: 'projects/p', commitIndex: 1 },
};

const audioSetupOneBand: AudioSetup = {
  files: [{ id: 'file-1', name: 'Demo', filePath: 'demo.mp3', autoPlay: true }],
  bands: [
    {
      id: 'band-1',
      name: '01',
      sourceFileId: 'file-1',
      frequencyBands: [[20, 20000]],
      attackHalfLifeSeconds: 1 / 120,
      releaseHalfLifeSeconds: 1 / 120,
      fftSize: 2048,
    },
  ],
  remappers: [
    {
      id: 'remap-1',
      name: 'Remap 1',
      bandId: 'band-1',
      inMin: 0,
      inMax: 1,
    },
  ],
};

const audioSetupEmpty: AudioSetup = { files: [], bands: [], remappers: [] };

const audioSetupWithArrangement: AudioSetup = {
  ...audioSetupEmpty,
  arrangementSnapshot,
};

const graphWithUnboundMidi = addMidiEnvelopeBinding(graph, '', '', {
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

const panelMeta = {
  title: 'ShaderNoice/floating-panel/ParameterDriverPanel UX v2',
  component: ParameterDriverPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ParameterDriverPanel>;

export default panelMeta;
type PanelStory = StoryObj<typeof panelMeta>;

const panelCallbacks = {
  onSelect: () => {},
  onClose: () => {},
  onAudioSetupChange: () => {},
  onGraphUpdate: () => {},
};

/** Overview — one band in nav, remapper card with Connect (no toolbar Connect). */
export const OverviewAudioOneBand: PanelStory = {
  name: 'Panel / Overview audio one band',
  args: {
    open: true,
    x: 520,
    y: 380,
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph,
    audioSetup: audioSetupOneBand,
    nodeSpecs: new Map(),
    ...panelCallbacks,
  },
};

/** Overview — empty audio library with primary New band CTA. */
export const OverviewAudioEmpty: PanelStory = {
  name: 'Panel / Overview audio empty',
  args: {
    open: true,
    x: 520,
    y: 380,
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph,
    audioSetup: audioSetupEmpty,
    nodeSpecs: new Map(),
    ...panelCallbacks,
  },
};

/** Overview — MIDI nav + single envelope card; Connect on card (toolbar: New envelope only). */
export const OverviewMidiSingleCard: PanelStory = {
  name: 'Panel / Overview MIDI single card',
  args: {
    open: true,
    x: 520,
    y: 380,
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph: graphWithUnboundMidi,
    audioSetup: audioSetupWithArrangement,
    nodeSpecs: new Map(),
    ...panelCallbacks,
  },
};

/** Overview — arrangement present, no envelope presets yet. */
export const OverviewMidiEmpty: PanelStory = {
  name: 'Panel / Overview MIDI empty',
  args: {
    open: true,
    x: 520,
    y: 380,
    targetNodeId: 'node-1',
    targetParameter: 'intensity',
    graph,
    audioSetup: audioSetupWithArrangement,
    nodeSpecs: new Map(),
    ...panelCallbacks,
  },
};

/** Overview — no project data; MIDI tab enabled, Fetch project empty state (select MIDI tab in canvas). */
export const OverviewMidiNoProjectData: PanelStory = {
  name: 'Panel / Overview MIDI no project data',
  args: {
    open: true,
    x: 520,
    y: 380,
    targetNodeId: 'node-1',
    targetParameter: 'intensity',
    graph,
    audioSetup: audioSetupEmpty,
    nodeSpecs: new Map(),
    onImportArrangement: () => {},
    ...panelCallbacks,
  },
};

const contentMeta = {
  title: 'ShaderNoice/floating-panel/ParameterDriverPanel UX v2',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

type ContentStory = StoryObj;

/** Animation overview while a curve exists — no shared preset library copy. */
export const OverviewAnimationNoLibrary: ContentStory = {
  name: 'Content / Animation overview no library',
  render: () => ({
    Component: AnimationDriverPanelContent,
    props: {
      targetNodeId: 'node-1',
      targetParameter: 'amount',
      parameterTitle: 'Color Gradient · amount',
      graph: graphWithAnimation,
      nodeSpecs: new Map(),
      layoutMode: 'overview',
      onGraphUpdate: () => {},
      onReturnToFocusedEdit: () => {},
    },
  }),
  ...contentMeta,
};

export const EmptyStateAnimationAdd: ContentStory = {
  name: 'Content / Animation empty add driver',
  render: () => ({
    Component: AnimationDriverPanelContent,
    props: {
      targetNodeId: 'node-1',
      targetParameter: 'amount',
      parameterTitle: 'Color Gradient · amount',
      graph,
      nodeSpecs: new Map(),
      layoutMode: 'overview',
      onGraphUpdate: () => {},
    },
  }),
  ...contentMeta,
};

export const EmptyStateAudioOverview: ContentStory = {
  name: 'Content / Audio empty overview',
  render: () => ({
    Component: AudioDriverPanelContent,
    props: {
      targetNodeId: 'node-1',
      targetParameter: 'amount',
      graph,
      audioSetup: audioSetupEmpty,
      nodeSpecs: new Map(),
      onSelect: () => {},
      onAudioSetupChange: () => {},
      onNewBand: () => {},
    },
  }),
  ...contentMeta,
};

export const EmptyStateMidiOverview: ContentStory = {
  name: 'Content / MIDI empty overview',
  render: () => ({
    Component: MidiDriverPanelContent,
    props: {
      targetNodeId: 'node-1',
      targetParameter: 'amount',
      parameterTitle: 'Color Gradient · amount',
      graph,
      audioSetup: audioSetupWithArrangement,
      nodeSpecs: new Map(),
      layoutMode: 'overview',
      onGraphUpdate: () => {},
    },
  }),
  ...contentMeta,
};
