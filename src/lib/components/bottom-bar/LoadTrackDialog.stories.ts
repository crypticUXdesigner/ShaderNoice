import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './LoadTrackDialog.svelte';

const meta = {
  title: "ShaderNoice/bottom-bar/LoadTrackDialog",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
