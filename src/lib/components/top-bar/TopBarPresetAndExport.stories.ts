import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './TopBarPresetAndExport.svelte';

const meta = {
  title: "ShaderComposer/top-bar/TopBarPresetAndExport",
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
