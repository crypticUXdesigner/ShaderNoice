import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '../../../../utils/storybookSnippets';
import Component from './DropdownMenu.svelte';

const meta = {
  title: "ShaderNoice/ui/menu/DropdownMenu",
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
      children: storyTextSnippet("Menu"),
    },
  }),
};
