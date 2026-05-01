import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ColorPickerPopover.svelte';

const meta = {
  title: "ShaderNoice/node/parameters/ColorPickerPopover",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
