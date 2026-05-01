import type { StorybookConfig } from '@storybook/svelte-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Alias Storybook’s internal PreviewRender to our Svelte 5–compatible copy
 * (async boundaries, docgen event-arg filtering in DecoratorHandler). Revisit when
 * @storybook/svelte-vite ships an upstream fix; then remove the alias and patches.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts|svelte)'],
  addons: ['@storybook/addon-svelte-csf', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/svelte-vite',
  viteFinal: async (viteConfig) => {
    return mergeConfig(viteConfig, {
      build: {
        chunkSizeWarningLimit: 2000
      },
      resolve: {
        alias: {
          '@storybook/svelte/internal/PreviewRender.svelte': path.resolve(
            __dirname,
            'svelte-patches/PreviewRender.svelte'
          )
        }
      }
    });
  }
};

export default config;
