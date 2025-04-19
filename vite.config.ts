import path from 'path';
import { defineConfig } from 'vite';
import sourcemaps from 'rollup-plugin-sourcemaps';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // playwright-crx cannot be obfuscated
    minify: false,
    sourcemap: true,
    rollupOptions: {
      // @ts-ignore
      plugins: [sourcemaps()],
      input: {
        'background': path.resolve(__dirname, 'src/background.ts'),
        'sidepanel': path.resolve(__dirname, 'src/sidepanel/index.tsx'),
        'options': path.resolve(__dirname, 'src/options/index.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
