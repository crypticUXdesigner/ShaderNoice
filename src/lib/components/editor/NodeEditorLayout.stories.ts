import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodeEditorLayout.svelte';

const meta = {
  title: "ShaderNoice/editor/NodeEditorLayout",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
