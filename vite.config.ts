import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Served from https://jdilig.me/ux/dev-dashboard/ (copied into jdilig-me-v3/public by its sync script).
export default defineConfig({
  base: '/ux/dev-dashboard/',
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'], include: ['src/**/*.test.{ts,tsx}'] },
});
