import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Demo from './ButtonGroupDemo.svelte';
import ButtonGroup from './ButtonGroup.svelte';

const meta = {
  title: "ShaderNoice/ui/button/ButtonGroup",
  component: ButtonGroup,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    Component: Demo,
    props: {},
  }),
};
