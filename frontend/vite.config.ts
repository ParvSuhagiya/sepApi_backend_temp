import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['src/features/**', 'src/lib/**'],
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
    },
  },
});
