import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './CoordPadWithPorts.svelte';

const meta = {
  title: "ShaderComposer/node/parameters/CoordPadWithPorts",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
