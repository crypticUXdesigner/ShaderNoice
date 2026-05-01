import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ParamPort.svelte';

const meta = {
  title: "ShaderComposer/node/parameters/ParamPort",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
