import type { Meta, StoryObj } from '@storybook/svelte-vite';

import DriverPanelEmptyState from './DriverPanelEmptyState.svelte';
import DriverPanelEmptyStateShowcase from './DriverPanelEmptyStateShowcase.svelte';

const meta = {
  title: 'ShaderNoice/floating-panel/DriverPanelEmptyState',
  component: DriverPanelEmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DriverPanelEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: 'music-note-simple',
    iconVariant: 'filled',
    driverKind: 'midi',
    title: 'No MIDI track sets yet',
    copy: 'Create a track set for this parameter, or import arrangement note tracks first.',
  },
};

export const Spacious: Story = {
  args: {
    icon: 'line-segments',
    driverKind: 'animation',
    title: 'No shared animation presets',
    copy: 'Animation drivers are not shared like audio or MIDI remaps — each float port owns one lane.',
    secondaryHint: 'Optional: open the timeline panel for multi-lane overview.',
    spacious: true,
  },
};

export const WithPrimaryAction: StoryObj = {
  render: () => ({
    Component: DriverPanelEmptyStateShowcase,
  }),
};
