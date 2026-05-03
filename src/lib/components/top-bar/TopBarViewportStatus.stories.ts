import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './TopBarViewportStatus.svelte';

const meta = {
  title: "ShaderNoice/top-bar/TopBarViewportStatus",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
