import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './EditorParameterValueOverlay.svelte';

const meta = {
  title: "ShaderNoice/editor/EditorParameterValueOverlay",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
