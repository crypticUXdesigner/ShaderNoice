import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodePanelContent.svelte';

const meta = {
  title: "ShaderComposer/side-panel/NodePanelContent",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
