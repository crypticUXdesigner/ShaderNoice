import type { Meta, StoryObj } from '@storybook/svelte-vite';

import DriverPresetCardShell from './DriverPresetCardShell.svelte';
import DriverPresetCardShellShowcase from './DriverPresetCardShellShowcase.svelte';

const meta = {
  title: 'ShaderNoice/floating-panel/DriverPresetCardShell',
  component: DriverPresetCardShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DriverPresetCardShell>;

export default meta;

/** Default, selected, disconnect-action, and embedded surfaces. */
export const SurfaceVariants: StoryObj<typeof meta> = {
  render: () => ({
    Component: DriverPresetCardShellShowcase,
  }),
};
