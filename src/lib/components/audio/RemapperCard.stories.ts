import type { Meta, StoryObj } from '@storybook/svelte-vite';
import type { AudioRemapperEntry } from '../../../data-model/audioSetupTypes';
import type { DriverConnectionTargetDisplay } from '../floating-panel/driverTargetDisplay';
import Component from './RemapperCard.svelte';

const mockRemapper: AudioRemapperEntry = {
  id: 'story-remapper',
  name: 'Level',
  bandId: 'story-band',
  inMin: 0,
  inMax: 1,
  outMin: 0,
  outMax: 1,
};

const targetAmount: DriverConnectionTargetDisplay = {
  nodeId: 'node-1',
  paramName: 'amount',
  paramLabel: 'Amount',
  nodeLabel: 'Color Gradient',
  nodeIconIdentifier: 'gradient',
  categorySlug: 'color',
  subgroupSlug: '',
  fullTitle: 'Color Gradient · Amount',
};

const targetScale: DriverConnectionTargetDisplay = {
  nodeId: 'node-2',
  paramName: 'scale',
  paramLabel: 'Scale',
  nodeLabel: 'Sphere',
  nodeIconIdentifier: 'sphere',
  categorySlug: 'geometry',
  subgroupSlug: '',
  fullTitle: 'Sphere · Scale',
};

const meta = {
  title: 'ShaderNoice/audio/RemapperCard',
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    remapper: mockRemapper,
    onConnect: () => {},
    onDelete: () => {},
  },
};

export const WithDuplicate: Story = {
  args: {
    remapper: mockRemapper,
    onConnect: () => {},
    onDuplicate: () => {},
    onDelete: () => {},
  },
};

export const OneTarget: Story = {
  args: {
    remapper: mockRemapper,
    isConnectedToTarget: true,
    connectionTargets: [targetAmount],
    activeTargetNodeId: 'node-other',
    activeTargetParamName: 'mix',
    onDisconnect: () => {},
    onRevealParameter: () => {},
    onDelete: () => {},
  },
};

export const MultipleTargetsActiveHighlighted: Story = {
  args: {
    remapper: mockRemapper,
    connectionTargets: [targetAmount, targetScale],
    activeTargetNodeId: 'node-1',
    activeTargetParamName: 'amount',
    onConnect: () => {},
    onRevealParameter: () => {},
    onDelete: () => {},
  },
};
