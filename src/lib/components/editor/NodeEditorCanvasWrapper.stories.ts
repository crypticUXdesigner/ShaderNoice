import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodeEditorCanvasWrapper.svelte';

const meta = {
  title: "ShaderNoice/editor/NodeEditorCanvasWrapper",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
