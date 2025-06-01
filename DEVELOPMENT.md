# Development Guide

## Hot Reloading Setup

This project now includes proper hot reloading for browser extension development.

### Quick Start

1. **Start development mode:**
   ```bash
   npm run dev
   ```

2. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `dist` folder from this project
   - The extension will now be loaded and ready to use

3. **Making changes:**
   - Edit any file in the `src/` directory
   - Save the file
   - Vite will automatically rebuild the extension
   - Click the refresh icon on your extension card in `chrome://extensions/`
   - Your changes will now be visible!

### Available Scripts

- `npm run dev` - Start development mode with file watching and auto-rebuild
- `npm run build` - Build the extension for production
- `npm run dev:serve` - Start Vite dev server (for web development, not extension)
- `npm run copy-static` - Copy static files from public/ to dist/

### How It Works

The development setup:

1. **Copies static files** from `public/` to `dist/` (manifest.json, HTML files, icons)
2. **Compiles TypeScript** files
3. **Builds with Vite** in watch mode, outputting to `dist/`
4. **Watches for changes** and rebuilds automatically

### File Structure

```
dist/                 # Built extension files (load this in Chrome)
├── manifest.json     # Extension manifest
├── background.js     # Background script
├── sidepanel.js      # Side panel script
├── options.js        # Options page script
├── sidepanel.html    # Side panel HTML
├── options.html      # Options page HTML
├── assets/           # CSS and other assets
└── icons/            # Extension icons
```

### Troubleshooting

**Changes not appearing?**
1. Make sure you clicked the refresh icon on the extension card
2. Check the terminal for build errors
3. Try reloading the extension completely (remove and re-add)

**Build errors?**
1. Check TypeScript compilation errors in the terminal
2. Ensure all dependencies are installed: `npm install`
3. Try cleaning and rebuilding: `rm -rf dist && npm run dev`

### Extension Reloading

Unlike web applications, browser extensions require manual reloading after code changes. The workflow is:

1. Make code changes
2. Save files (Vite rebuilds automatically)
3. Go to `chrome://extensions/`
4. Click the refresh icon on your extension
5. Test your changes

This is much faster than the traditional build-and-reload cycle, as the build happens automatically in the background.
