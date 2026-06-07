import type { Meta, StoryObj } from '@storybook/svelte-vite';
import type { AudioRemapperEntry } from '../../../data-model/audioSetupTypes';
import Component from './RemapperCard.svelte';

const mockRemapper: AudioRemapperEntry = {
  id: 'story-remapper',
  name: 'Level',
  bandId: 'story-band',
  inMin: 0,
  inMax: 1,
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

export const DriverFocusedGateAndTarget: Story = {
  args: {
    remapper: mockRemapper,
    controlsLayout: 'driver-focused',
    remapSections: 'both',
    targetOutMin: 0,
    targetOutMax: 1.6,
    paramMin: 0,
    paramMax: 1.6,
    liveValues: { incoming: 0.55, outgoing: 0.88 },
    onDisconnect: () => {},
    onTargetOutChange: () => {},
    onDelete: () => {},
  },
};

export const DriverFocusedGateOnly: Story = {
  args: {
    remapper: mockRemapper,
    controlsLayout: 'driver-focused',
    remapSections: 'gateOnly',
    liveValues: { incoming: 0.55, outgoing: null },
    onConnect: () => {},
    onDelete: () => {},
  },
};
