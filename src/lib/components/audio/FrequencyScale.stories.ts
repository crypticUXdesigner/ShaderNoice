import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './FrequencyScale.svelte';

const meta = {
  title: "ShaderNoice/audio/FrequencyScale",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
