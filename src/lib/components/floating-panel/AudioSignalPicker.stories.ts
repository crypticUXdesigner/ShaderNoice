import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './AudioSignalPicker.svelte';

const meta = {
  title: "ShaderNoice/floating-panel/AudioSignalPicker",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
