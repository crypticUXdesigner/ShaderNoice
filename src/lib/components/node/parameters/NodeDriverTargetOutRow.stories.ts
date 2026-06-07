import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './NodeDriverTargetOutRow.svelte';

const meta = {
  title: 'ShaderNoice/node/parameters/NodeDriverTargetOutRow',
  component: Component,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onChange: { action: 'change' },
    onCommit: { action: 'commit' },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    outMin: 0,
    outMax: 1,
    paramMin: 0,
    paramMax: 1,
    paramType: 'float',
    paramStep: 0.01,
    liveOutValue: 0.42,
  },
};

export const InvertedOut: Story = {
  args: {
    outMin: 0.85,
    outMax: 0.15,
    paramMin: 0,
    paramMax: 1,
    paramType: 'float',
    liveOutValue: 0.5,
  },
};

export const OpenSpecRange: Story = {
  args: {
    outMin: -500,
    outMax: 2500,
    paramType: 'float',
    liveOutValue: 120,
  },
};

export const Bypassed: Story = {
  args: {
    outMin: 0.2,
    outMax: 0.8,
    paramMin: 0,
    paramMax: 1,
    driverBypassed: true,
    liveOutValue: 0.55,
  },
};
