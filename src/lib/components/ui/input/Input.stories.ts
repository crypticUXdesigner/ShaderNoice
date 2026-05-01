import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './Input.svelte';

const meta = {
  title: "ShaderNoice/ui/input/Input",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "Hello", placeholder: "Placeholder" },
};
