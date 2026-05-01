import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '../../../../utils/storybookSnippets';
import Component from './Message.svelte';

const meta = {
  title: "ShaderComposer/ui/display/Message",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { inline: true, variant: 'info', visible: true },
  render: (args) => ({
    Component,
    props: {
      ...args,
      children: storyTextSnippet('Message body text.'),
    },
  }),
};
