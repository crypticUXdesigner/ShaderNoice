import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodeBody.svelte';

const meta = {
  title: "ShaderNoice/node/NodeBody",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
