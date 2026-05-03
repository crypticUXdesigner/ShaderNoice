import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './TimelinePanel.svelte';

const meta = {
  title: "ShaderNoice/timeline/TimelinePanel",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
