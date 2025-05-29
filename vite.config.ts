import path from 'path';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx, ManifestV3Export } from '@crxjs/vite-plugin';
import manifest from './manifest.json'
import pkg from './package.json'

const localize = false;
const isDev = process.env.__DEV__ === 'true';

export const baseManifest = {
  ...manifest,
  version: pkg.version,
  ...(localize ? {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale : 'en'
  } : {})
} as ManifestV3Export

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    crx({
      manifest: baseManifest,
      browser: 'chrome',
      contentScripts: {
        injectCss: true,
      }
    }),
    tailwindcss(),
  ],
  optimizeDeps: {
    exclude: ['playwright-crx']
  },
  build: {
    // playwright-crx cannot be obfuscated
    minify: false,
    sourcemap: true,
    emptyOutDir: mode == 'production',
  },
}));
