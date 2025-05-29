import path from 'path';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx, ManifestV3Export } from '@crxjs/vite-plugin';
import manifest from './manifest.json'
// import devManifest from './manifest.dev.json';
import pkg from './package.json'

const localize = false;
const isDev = process.env.__DEV__ === 'true';

export const baseManifest = {
  ...manifest,
  version: pkg.version,
  // ...(isDev ? devManifest : {} as ManifestV3Export),
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

    // import { crx } from '@crxjs/vite-plugin';
    // import manifest from './src/manifest.json'
    crx({
      manifest: {
        ...baseManifest,
        // background: {
        //   service_worker: "background.ts",
        //   type: "module"
        // },
      } as ManifestV3Export,
      browser: 'chrome',
      contentScripts: {
        injectCss: true,
      }
    }),

    // No overload matches this call
    // import webExtension from "@samrum/vite-plugin-web-extension";
    //
    // webExtension({
    //   manifest: {
    //     name: "", pkg.name,
    //     description: pkg.description,
    //     version: pkg.version,
    //     manifest_version: 3,
    //     background: {
    //       service_worker: "background.ts",
    //     }
    //   }
    // }),
    tailwindcss(),
  ],
  build: {
    // playwright-crx cannot be obfuscated
    minify: false,
    sourcemap: true, // isDev,
    emptyOutDir: mode == 'production',

    // rollupOptions: {
    //   // @ts-ignore
    //   plugins: [sourcemaps()],
    //   input: {
    //     'background': path.resolve(__dirname, 'src/background.ts'),
    //     'sidepanel': path.resolve(__dirname, 'src/sidepanel/index.tsx'),
    //     'options': path.resolve(__dirname, 'src/options/index.tsx'),
    //   },
    //   output: {
    //     entryFileNames: '[name].js',
    //     assetFileNames: (assetInfo) => {
    //       // Use a fixed name for CSS files
    //       if (assetInfo.name && assetInfo.name.endsWith('.css')) {
    //         return 'assets/styles.css';
    //       }
    //       // Use the default naming pattern for other assets
    //       return 'assets/[name].[hash].[ext]';
    //     },
    //   },
    // },
  },
}));
