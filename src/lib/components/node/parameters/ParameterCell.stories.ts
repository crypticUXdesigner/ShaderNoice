import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '../../../../utils/storybookSnippets';
import Component from './ParameterCell.svelte';

const meta = {
  title: "ShaderNoice/node/parameters/ParameterCell",
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
      children: storyTextSnippet("Parameter"),
    },
  }),
};
