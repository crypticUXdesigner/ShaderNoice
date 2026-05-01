import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './VideoExportProgressOverlay.svelte';

const meta = {
  title: "ShaderNoice/export/VideoExportProgressOverlay",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
