import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './RangeSlider.svelte';

const meta = {
  title: "ShaderComposer/ui/input/RangeSlider",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
