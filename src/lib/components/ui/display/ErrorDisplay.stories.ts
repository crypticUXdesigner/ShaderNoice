import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ErrorDisplay.svelte';

const meta = {
  title: "ShaderNoice/ui/display/ErrorDisplay",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
