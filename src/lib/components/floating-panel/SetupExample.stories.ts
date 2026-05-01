import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './SetupExample.svelte';

const meta = {
  title: "ShaderComposer/floating-panel/SetupExample",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
