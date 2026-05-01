import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './ValueInput.svelte';

const meta = {
  title: "ShaderComposer/ui/input/ValueInput",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 0.5, onChange: () => {}, onCommit: () => {} },
};
