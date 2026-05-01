import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './BandCard.svelte';

const meta = {
  title: "ShaderComposer/audio/BandCard",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
