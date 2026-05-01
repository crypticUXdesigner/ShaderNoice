import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './SignalConnectionPicker.svelte';

const meta = {
  title: "ShaderNoice/audio/SignalConnectionPicker",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
