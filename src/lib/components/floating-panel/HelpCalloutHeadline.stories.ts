import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './HelpCalloutHeadline.svelte';

const meta = {
  title: "ShaderNoice/floating-panel/HelpCalloutHeadline",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
