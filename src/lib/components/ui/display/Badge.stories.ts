import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './Badge.svelte';

const meta = {
  title: "ShaderComposer/ui/display/Badge",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 3 },
};
