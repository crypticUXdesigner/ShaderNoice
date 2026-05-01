import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './VerticalRangeSlider.svelte';

const meta = {
  title: "ShaderNoice/ui/input/VerticalRangeSlider",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { lowValue: 0.2, highValue: 0.8, onChange: () => {} },
};
