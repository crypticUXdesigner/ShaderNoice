import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './CoordPad.svelte';

const meta = {
  title: "ShaderNoice/node/parameters/CoordPad",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
