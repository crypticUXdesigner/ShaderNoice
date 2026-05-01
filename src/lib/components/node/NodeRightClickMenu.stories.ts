import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodeRightClickMenu.svelte';

const meta = {
  title: "ShaderComposer/node/NodeRightClickMenu",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
