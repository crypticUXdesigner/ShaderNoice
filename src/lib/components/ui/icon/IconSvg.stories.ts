import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './IconSvg.svelte';

const meta = {
  title: "ShaderComposer/ui/icon/IconSvg",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "plus" },
};
