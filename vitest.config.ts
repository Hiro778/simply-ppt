import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    environment: 'jsdom',
    isolate: false,
    pool: 'forks',
    forks: {
      singleFork: true,
    },
    testTimeout: 60000,
    hookTimeout: 90000,
  },
});
