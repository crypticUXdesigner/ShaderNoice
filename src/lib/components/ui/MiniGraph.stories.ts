import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './MiniGraph.svelte';

const meta = {
  title: "ShaderNoice/ui/MiniGraph",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
