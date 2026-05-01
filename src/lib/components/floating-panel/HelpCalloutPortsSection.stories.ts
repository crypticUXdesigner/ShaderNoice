import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './HelpCalloutPortsSection.svelte';

const meta = {
  title: "ShaderNoice/floating-panel/HelpCalloutPortsSection",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
