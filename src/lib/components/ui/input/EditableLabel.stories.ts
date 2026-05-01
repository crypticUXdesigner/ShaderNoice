import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './EditableLabel.svelte';

const meta = {
  title: "ShaderNoice/ui/input/EditableLabel",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "Double-click to edit", onCommit: () => {} },
};
