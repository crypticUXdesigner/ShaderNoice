import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './RemapperCard.svelte';

const meta = {
  title: "ShaderNoice/audio/RemapperCard",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
