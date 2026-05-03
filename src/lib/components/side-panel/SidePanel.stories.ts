import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './SidePanel.svelte';

const meta = {
  title: "ShaderNoice/side-panel/SidePanel",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
