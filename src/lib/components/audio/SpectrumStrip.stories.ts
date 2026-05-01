import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './SpectrumStrip.svelte';

const meta = {
  title: "ShaderNoice/audio/SpectrumStrip",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
