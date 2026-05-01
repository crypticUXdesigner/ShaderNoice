import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './TimelineCurveEditor.svelte';

const meta = {
  title: "ShaderComposer/timeline/TimelineCurveEditor",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
