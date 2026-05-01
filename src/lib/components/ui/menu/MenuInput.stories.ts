import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './MenuInput.svelte';

const meta = {
  title: "ShaderNoice/ui/menu/MenuInput",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
