import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/the-navbar-1/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});
