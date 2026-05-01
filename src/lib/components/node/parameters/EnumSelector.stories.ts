import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './EnumSelector.svelte';

const meta = {
  title: "ShaderNoice/node/parameters/EnumSelector",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
