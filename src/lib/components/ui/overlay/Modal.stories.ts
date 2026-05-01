import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '../../../../utils/storybookSnippets';
import Component from './Modal.svelte';

const meta = {
  title: "ShaderComposer/ui/overlay/Modal",
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
      open: true, onClose: () => {},
      children: storyTextSnippet("<p>Modal body</p>"),
    },
  }),
};
