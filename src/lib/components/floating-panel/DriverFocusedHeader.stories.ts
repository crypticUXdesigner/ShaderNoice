import type { Meta, StoryObj } from '@storybook/svelte-vite';

import DriverFocusedHeader from './DriverFocusedHeader.svelte';

import DriverFocusedHeaderShowcase from './DriverFocusedHeaderShowcase.svelte';

import type { DriverTargetDisplay } from './driverTargetDisplay';



const sampleTarget: DriverTargetDisplay = {

  nodeId: 'node-1',

  paramName: 'amount',

  paramLabel: 'Amount',

  nodeLabel: 'Color gradient',

  nodeIconIdentifier: 'grid',

  categorySlug: 'utilities',

  subgroupSlug: '',

  fullTitle: 'Color gradient · Amount',

};



const meta = {

  title: 'ShaderNoice/floating-panel/DriverFocusedHeader',

  component: DriverFocusedHeader,

  tags: ['autodocs'],

  parameters: {

    layout: 'centered',

  },

} satisfies Meta<typeof DriverFocusedHeader>;



export default meta;

type Story = StoryObj<typeof meta>;



/** MIDI — target + live value only. */

export const MidiTargetLive: Story = {

  args: {

    target: {

      ...sampleTarget,

      paramLabel: 'Scale X',

      nodeLabel: 'Transform',

      fullTitle: 'Transform · Scale X',

    },

    liveValue: 10,

  },

};



/** Audio, animation, and MIDI headers at focused panel width (~520px). */

export const AllKindsSideBySide: StoryObj = {

  render: () => ({

    Component: DriverFocusedHeaderShowcase,

  }),

};

