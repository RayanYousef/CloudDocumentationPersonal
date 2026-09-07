import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import platform from '../../platform.config.js';

export default defineConfig({
  plugins: [react()],
  base: `${platform.baseUrl}editor/`,
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
