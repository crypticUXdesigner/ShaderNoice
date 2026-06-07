import type { Meta, StoryObj } from '@storybook/svelte-vite';
import nodeDocumentation from '../../../data/node-documentation.json';
import { nodeSystemSpecs } from '../../../shaders/nodes';
import type { HelpContent, HelpPort } from '../../../utils/ContextualHelpManager';
import Component from './HelpCalloutPortsSection.svelte';

const nodeSpecs = new Map(nodeSystemSpecs.map((spec) => [spec.id, spec]));
const noiseGuideContent = nodeDocumentation.helpItems['node:noise'] as HelpContent;

const meta = {
  title: 'ShaderNoice/floating-panel/HelpCalloutPortsSection',
  component: Component,
  tags: ['autodocs'],
  args: {
    nodeSpecs,
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ports: noiseGuideContent.outputs ?? [],
    getSuggestions: (port: HelpPort) => port.suggestedTargets,
  },
};

export const WithNodeNavigation: Story = {
  args: {
    ports: noiseGuideContent.outputs ?? [],
    getSuggestions: (port: HelpPort) => port.suggestedTargets,
    onOpenNodeHelp: (nodeType: string) => {
      console.log('onOpenNodeHelp', nodeType);
    },
  },
};
