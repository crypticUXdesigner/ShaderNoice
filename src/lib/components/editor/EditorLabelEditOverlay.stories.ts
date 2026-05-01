import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './EditorLabelEditOverlay.svelte';

const meta = {
  title: "ShaderComposer/editor/EditorLabelEditOverlay",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
