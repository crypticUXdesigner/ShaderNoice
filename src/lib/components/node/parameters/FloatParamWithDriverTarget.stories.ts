import type { Meta, StoryObj } from '@storybook/svelte-vite';
import FloatParamWithDriverTargetStoryHost from './FloatParamWithDriverTargetStoryHost.svelte';

const meta = {
  title: 'ShaderNoice/node/parameters/FloatParamWithDriverTarget',
  component: FloatParamWithDriverTargetStoryHost,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FloatParamWithDriverTargetStoryHost>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ValueInput with compact target range row — slider fallback for non-knob driven params. */
export const WithDriverTarget: Story = {
  args: {
    value: 0.35,
    driverTargetOut: { outMin: 0.1, outMax: 0.9 },
  },
};

export const Bypassed: Story = {
  args: {
    value: 0.35,
    driverTargetOut: { outMin: 0.1, outMax: 0.9 },
    driverBypassed: true,
  },
};
