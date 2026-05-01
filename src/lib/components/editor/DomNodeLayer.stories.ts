import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './DomNodeLayer.svelte';

const meta = {
  title: "ShaderComposer/editor/DomNodeLayer",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
