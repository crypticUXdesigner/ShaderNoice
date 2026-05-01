import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodePanelHeader.svelte';

const meta = {
  title: "ShaderComposer/side-panel/NodePanelHeader",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
