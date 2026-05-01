import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '../../../../utils/storybookSnippets';
import Component from './Popover.svelte';

const meta = {
  title: "ShaderNoice/ui/overlay/Popover",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    Component,
    props: {
      ...args,
      open: true, x: 120, y: 120, onClose: () => {},
      children: storyTextSnippet("Popover content"),
    },
  }),
};
