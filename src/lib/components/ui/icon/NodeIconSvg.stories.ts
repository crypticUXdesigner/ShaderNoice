import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodeIconSvg.svelte';

const meta = {
  title: "ShaderComposer/ui/icon/NodeIconSvg",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { identifier: "wave-sine" },
};
