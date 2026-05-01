import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './Node.svelte';

const meta = {
  title: "ShaderNoice/node/Node",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
