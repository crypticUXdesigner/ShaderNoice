import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './DocsPanelContent.svelte';

const meta = {
  title: "ShaderNoice/side-panel/DocsPanelContent",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
