import type { Meta, StoryObj } from '@storybook/svelte-vite';
import nodeDocumentation from '../../../data/node-documentation.json';
import { nodeSystemSpecs } from '../../../shaders/nodes';
import type { HelpContent } from '../../../utils/ContextualHelpManager';
import Component from './HelpCalloutContent.svelte';

const nodeSpecs = new Map(nodeSystemSpecs.map((spec) => [spec.id, spec]));

const uvGuideContent = nodeDocumentation.helpItems['node:uv-coordinates'] as HelpContent;
const noiseGuideContent = nodeDocumentation.helpItems['node:noise'] as HelpContent;

const meta = {
  title: 'ShaderNoice/floating-panel/HelpCalloutContent',
  component: Component,
  tags: ['autodocs'],
  args: {
    nodeSpecs,
    helpNodeType: 'uv-coordinates',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHook: Story = {
  args: {
    content: uvGuideContent,
  },
};

export const WithoutHook: Story = {
  args: {
    content: { ...uvGuideContent, hook: undefined },
  },
};

export const WithNodeNavigation: Story = {
  args: {
    content: noiseGuideContent,
    helpNodeType: 'noise',
    onOpenNodeHelp: (nodeType: string) => {
      console.log('onOpenNodeHelp', nodeType);
    },
  },
};
