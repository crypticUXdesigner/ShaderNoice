import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './BottomBarPlaybackControls.svelte';

const meta = {
  title: "ShaderNoice/bottom-bar/BottomBarPlaybackControls",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
