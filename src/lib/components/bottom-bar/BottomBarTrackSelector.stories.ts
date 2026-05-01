import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './BottomBarTrackSelector.svelte';

const meta = {
  title: "ShaderComposer/bottom-bar/BottomBarTrackSelector",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
