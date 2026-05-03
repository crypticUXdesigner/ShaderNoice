import type { Meta, StoryObj } from '@storybook/svelte-vite';
import type { AudioBandEntry } from '../../../data-model/audioSetupTypes';
import Component from './BandCard.svelte';

const mockBand: AudioBandEntry = {
  id: 'story-band',
  name: 'Kick',
  sourceFileId: 'story-file',
  frequencyBands: [[60, 120]],
  fftSize: 2048,
};

const meta = {
  title: "ShaderNoice/audio/BandCard",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    band: mockBand,
  },
};
