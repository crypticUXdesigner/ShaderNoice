import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ParamPortWithAudioState.svelte';

const meta = {
  title: "ShaderComposer/node/parameters/ParamPortWithAudioState",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
