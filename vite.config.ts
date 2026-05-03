/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/** Avoid browser CORS: rpc.audiotool.com preflight fails from web origins unless whitelisted client-side. */
const audiotoolRpcProxy = {
  target: 'https://rpc.audiotool.com',
  changeOrigin: true,
  secure: true,
  rewrite: (path: string) => path.replace(/^\/__audiotool_rpc__/, ''),
} as const;

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
    /** So `http://127.0.0.1:3000` works (Audiotool OAuth forbids `localhost` in redirect URIs). */
    host: true,
    open: false,
    proxy: {
      '/__audiotool_rpc__': audiotoolRpcProxy,
    },
  },
  preview: {
    proxy: {
      '/__audiotool_rpc__': audiotoolRpcProxy,
    },
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
