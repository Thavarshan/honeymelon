import { defineConfig } from 'vite';

// Bundling both entries proves the library and its worker are self-contained
// browser code; the host still bundles them from `dist/` itself.
export default defineConfig({
  build: {
    outDir: '.bundle',
    lib: {
      entry: { browser: 'src/index.ts', worker: 'src/media-worker.ts' },
      formats: ['es'],
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message.includes('externalized for browser')) {
          throw new Error(warning.message);
        }

        warn(warning);
      },
    },
  },
});
