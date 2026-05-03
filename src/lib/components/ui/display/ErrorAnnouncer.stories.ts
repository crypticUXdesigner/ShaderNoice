import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ErrorAnnouncer.svelte';

const meta = {
  title: "ShaderNoice/ui/display/ErrorAnnouncer",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
