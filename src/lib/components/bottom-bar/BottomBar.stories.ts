import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './BottomBar.svelte';

const meta = {
  title: "ShaderNoice/bottom-bar/BottomBar",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
