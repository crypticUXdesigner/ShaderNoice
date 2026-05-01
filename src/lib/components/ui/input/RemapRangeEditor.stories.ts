import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './RemapRangeEditor.svelte';

const meta = {
  title: "ShaderComposer/ui/input/RemapRangeEditor",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
