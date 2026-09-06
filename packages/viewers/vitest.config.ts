import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'viewers', environment: 'jsdom', include: ['test/**/*.test.tsx'] } });
