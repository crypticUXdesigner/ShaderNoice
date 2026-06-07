import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { resolveDriverTargetOutUiBounds } from '../../../../utils/driverRemap';
import Component from './Knob.svelte';
import KnobDriverTargetStoryHost from './KnobDriverTargetStoryHost.svelte';

const PARAM_MIN = 0;
const PARAM_MAX = 1;
const OUT_BOUNDS = resolveDriverTargetOutUiBounds(PARAM_MIN, PARAM_MAX);

const meta = {
  title: 'ShaderNoice/node/parameters/Knob',
  component: Component,
  tags: ['autodocs'],
  args: {
    value: 0.42,
    min: PARAM_MIN,
    max: PARAM_MAX,
    step: 0.01,
    decimals: 2,
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };

/** Full-span driver target Out range on the outer arc. */
export const DriverTargetWide: Story = {
  args: {
    connected: true,
    driverTargetOut: { outMin: 0, outMax: 1 },
    outBounds: OUT_BOUNDS,
  },
};

/** Narrow driver target span — endpoints close together on the arc. */
export const DriverTargetNarrow: Story = {
  args: {
    connected: true,
    value: 0.5,
    driverTargetOut: { outMin: 0.4, outMax: 0.6 },
    outBounds: OUT_BOUNDS,
  },
};

/** Inverted Out (outMin > outMax): handles at swapped positions; arc spans the shorter sweep. */
export const DriverTargetInverted: Story = {
  args: {
    connected: true,
    value: 0.5,
    driverTargetOut: { outMin: 0.85, outMax: 0.15 },
    outBounds: OUT_BOUNDS,
  },
};

/** Degenerate Out min === max: single handle, no outer arc stroke. */
export const DriverTargetDegenerate: Story = {
  args: {
    connected: true,
    value: 0.5,
    driverTargetOut: { outMin: 0.5, outMax: 0.5 },
    outBounds: OUT_BOUNDS,
  },
};

/** Bypass dim: outer target arc stays editable but visually muted. */
export const DriverTargetBypassed: Story = {
  args: {
    connected: true,
    driverBypassed: true,
    driverTargetOut: { outMin: 0.2, outMax: 0.8 },
    outBounds: OUT_BOUNDS,
  },
};

/** Interactive host — drag inner ring and outer Out handles; state updates in place. */
export const DriverTargetInteractive: StoryObj = {
  render: () => ({
    Component: KnobDriverTargetStoryHost,
    props: {
      connected: true,
      driverTargetOut: { outMin: 0.15, outMax: 0.85 },
      outBounds: OUT_BOUNDS,
    },
  }),
};
