/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/starmap/' : '/',
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  plugins: [react(), tailwindcss()],
  test: {
    globals: false,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
}));
