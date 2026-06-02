import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ParamPort.svelte';

const meta = {
  title: "ShaderNoice/node/parameters/ParamPort",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };

export const AudioDriver: Story = {
  args: {
    attachedDriverKind: 'audio',
    state: 'audio-connected',
    signalName: 'Bass drive',
  },
};

export const AnimationDriver: Story = {
  args: {
    attachedDriverKind: 'animation',
    timelineDriven: true,
  },
};

export const MidiEnvelopeDriver: Story = {
  args: {
    attachedDriverKind: 'midi',
  },
};
