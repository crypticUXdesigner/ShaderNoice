import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './DriverRemapSection.svelte';

const meta = {
  title: 'ShaderNoice/floating-panel/DriverRemapSection',
  component: Component,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onChange: { action: 'change' },
    onCommit: { action: 'commit' },
    matchParameterRange: { action: 'matchParameter' },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    inMin: 0,
    inMax: 1,
    outMin: 0,
    outMax: 1,
  },
};

export const AsymmetricOut: Story = {
  args: {
    inMin: 0.2,
    inMax: 0.9,
    outMin: -0.5,
    outMax: 4,
  },
};

export const LiveNeedles: Story = {
  args: {
    inMin: 0,
    inMax: 1,
    outMin: -0.5,
    outMax: 4,
    liveInValue: 0.65,
    liveOutValue: 2.1,
  },
};

export const MatchParameter: Story = {
  args: {
    inMin: 0,
    inMax: 1,
    outMin: 0,
    outMax: 1,
    paramMin: -2,
    paramMax: 8,
    matchParameterRange: () => {},
  },
};

export const DriverFocused: Story = {
  args: {
    inMin: 0.3,
    inMax: 1,
    outMin: 0,
    outMax: 1.2,
    paramMin: 0,
    paramMax: 1.6,
    paramStep: 0.01,
    paramType: 'float',
    controlsLayout: 'driver-focused',
    liveInValue: 0.55,
    liveOutValue: 0.88,
  },
};

export const ParamBoundedTarget: Story = {
  args: {
    inMin: 0,
    inMax: 1,
    outMin: 0,
    outMax: 1.6,
    paramMin: 0,
    paramMax: 1.6,
    paramStep: 0.01,
    paramType: 'float',
    sections: 'targetOnly',
    controlsLayout: 'driver-focused',
    liveOutValue: 0.8,
    matchParameterRange: () => {},
  },
};

export const GateOnly: Story = {
  args: {
    inMin: 0.2,
    inMax: 0.85,
    outMin: 0,
    outMax: 1,
    sections: 'gateOnly',
    controlsLayout: 'driver-focused',
    liveInValue: 0.62,
  },
};

export const TargetOnly: Story = {
  args: {
    inMin: 0,
    inMax: 1,
    outMin: -0.5,
    outMax: 4,
    sections: 'targetOnly',
    liveOutValue: 2.1,
    paramMin: -2,
    paramMax: 8,
    matchParameterRange: () => {},
  },
};
