import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './TopBar.svelte';

const meta = {
  title: "ShaderComposer/top-bar/TopBar",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
