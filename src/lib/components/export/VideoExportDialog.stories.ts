import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './VideoExportDialog.svelte';

function createStoryPrimaryAudio(durationSeconds = 148.51): () => {
  nodeId: string;
  buffer: AudioBuffer;
} | null {
  return () => {
    if (typeof window === 'undefined') return null;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const sampleRate = 44100;
      const length = Math.max(2, Math.floor(durationSeconds * sampleRate));
      const buffer = ctx.createBuffer(1, length, sampleRate);
      void ctx.close();
      return { nodeId: 'story-primary', buffer };
    } catch {
      return null;
    }
  };
}

const meta = {
  title: 'ShaderComposer/export/VideoExportDialog',
  component: Component,
  tags: ['autodocs'],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default story shows the range-slider path (requires AudioContext — run in browser). */
export const WithPrimaryAudio: Story = {
  args: {
    visible: true,
    getPrimaryAudio: createStoryPrimaryAudio(),
  },
};

/** Number field for duration when no decoded buffer / video-only flows. */
export const WithoutPrimaryAudio: Story = {
  args: {
    visible: true,
    getPrimaryAudio: () => null,
  },
};
