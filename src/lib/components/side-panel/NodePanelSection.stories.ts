import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '../../../utils/storybookSnippets';
import Component from './NodePanelSection.svelte';

const meta = {
  title: "ShaderComposer/side-panel/NodePanelSection",
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
      children: storyTextSnippet("Section"),
    },
  }),
};
