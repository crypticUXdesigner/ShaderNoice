import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodeEditorCanvasWrapper.svelte';

const meta = {
  title: "ShaderComposer/editor/NodeEditorCanvasWrapper",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
