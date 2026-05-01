import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './AudioSignalPickerPanel.svelte';

const meta = {
  title: "ShaderComposer/floating-panel/AudioSignalPickerPanel",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
