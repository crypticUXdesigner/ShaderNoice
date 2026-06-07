import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './AudioDriverPanelContent.svelte';
import type { NodeGraph } from '../../../data-model/types';
import type { AudioSetup } from '../../../data-model/audioSetupTypes';

const graph: NodeGraph = {
  id: 'graph-story',
  name: 'Story',
  version: '2.0',
  nodes: [{ id: 'node-1', type: 'color-gradient', parameters: {}, position: { x: 0, y: 0 } }],
  connections: [],
  viewState: { zoom: 1, panX: 0, panY: 0, selectedNodeIds: [] },
};

const audioSetup: AudioSetup = {
  files: [{ id: 'file-1', name: 'Demo', filePath: 'demo.mp3', autoPlay: true }],
  bands: [
    {
      id: 'band-1',
      name: '01',
      sourceFileId: 'file-1',
      frequencyBands: [[20, 20000]],
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

const meta = {
  title: 'ShaderNoice/floating-panel/AudioDriverPanelContent',
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    targetNodeId: 'node-1',
    targetParameter: 'amount',
    graph,
    audioSetup,
    nodeSpecs: new Map(),
    onSelect: () => {},
    onAudioSetupChange: () => {},
  },
};
