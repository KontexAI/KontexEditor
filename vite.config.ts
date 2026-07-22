import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Library build: UMD bundle exposes a global `KontexEditor` for <script> embedding,
// plus an ESM build for bundler/npm consumers. CSS is injected at runtime by the
// editor itself, so a single UMD <script> is fully self-contained.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'KontexEditor',
      fileName: 'kontex-editor',
      formats: ['es', 'umd'],
    },
    sourcemap: true,
  },
});
