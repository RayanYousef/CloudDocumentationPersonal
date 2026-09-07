import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// `root` is resolved against process.cwd(), not this file, so anchor it explicitly to the repo root.
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({ test: { name: 'root-scripts', include: ['scripts/**/*.test.ts'], root: repoRoot } });
