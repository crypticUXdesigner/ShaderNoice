import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './HelpCalloutParametersSection.svelte';

const meta = {
  title: "ShaderNoice/floating-panel/HelpCalloutParametersSection",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
