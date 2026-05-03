import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './TimelineCurveEditor.svelte';

const meta = {
  title: "ShaderNoice/timeline/TimelineCurveEditor",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
