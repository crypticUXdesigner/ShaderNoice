import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './FrequencyRangeEditor.svelte';

const meta = {
  title: "ShaderComposer/audio/FrequencyRangeEditor",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
