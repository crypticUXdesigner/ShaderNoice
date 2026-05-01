import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './Knob.svelte';

const meta = {
  title: "ShaderComposer/node/parameters/Knob",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
