import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './AudioSignalPickerCompact.svelte';

const meta = {
  title: "ShaderNoice/floating-panel/AudioSignalPickerCompact",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
