import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🐝 BrowserBee Development Helper\n');
console.log('Your extension is now being built in watch mode!');
console.log('\nTo see your changes:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode" (toggle in top right)');
console.log('3. Click "Load unpacked" and select the "dist" folder');
console.log('4. When you make changes, click the refresh icon on your extension card');
console.log('\nThe build will automatically update when you save files.');
console.log('Just refresh the extension in Chrome to see your changes!\n');

// Check if dist folder exists
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  console.log('✅ dist folder exists and ready for loading');
} else {
  console.log('❌ dist folder not found - build may have failed');
}

console.log('\nPress Ctrl+C to stop the development server.\n');
