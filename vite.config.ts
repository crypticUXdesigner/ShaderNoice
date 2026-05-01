/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: '/ShaderNoice/',
  plugins: [
    svelte({
      compilerOptions: {
        runes: true
      },
      dynamicCompileOptions({ filename }) {
        if (filename.includes('node_modules')) {
          return { runes: false };
        }
      },
      onwarn(warning, defaultHandler) {
        if (warning.code?.startsWith('a11y-') || warning.code?.startsWith('a11y_')) return;
        defaultHandler(warning);
      }
    })
  ],
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
