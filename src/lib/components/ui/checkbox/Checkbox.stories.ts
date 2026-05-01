import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './Checkbox.svelte';

const meta = {
  title: "ShaderNoice/ui/checkbox/Checkbox",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Example option", checked: true },
};
