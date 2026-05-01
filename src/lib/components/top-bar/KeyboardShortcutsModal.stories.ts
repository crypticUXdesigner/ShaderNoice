import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './KeyboardShortcutsModal.svelte';

const meta = {
  title: "ShaderNoice/top-bar/KeyboardShortcutsModal",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
