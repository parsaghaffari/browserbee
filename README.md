# BrowserBee 🐝

BrowserBee is a fully open source Chrome extension that allows you to control your browser using natural language. It uses Claude 3.7 Sonnet to interpret your instructions and Playwright to execute them. Given BrowserBee runs in a controlled environment within your browser, it can interact with websites you have logged into such as social media. This makes using it more convenient than running Playwright in the backend.

## Features

- Control your browser with natural language commands
- Take screenshots and analyze web content
- Navigate between tabs and manage browser windows
- Interact with web elements (click, type, etc.)

## Roadmap

Please refer to [todo.md](todo.md) for an up to date list of features we're aiming to add to BrowserBee. 

- Ability to save and replay previous sessions, i.e. a "macro" feature set
- Ability to run tasks periodically (great for repetitive tasks such as checking social media)
- Ability to learn from your local and personal usage, i.e. memorize and recall optimal tool use sequences 
- Support for more LLMs

If you're interested in contributing to build any of these features or to improve BrowserBee in any way, please head over to [CONTRIBUTING.md](CONTRIBUTING.md).

## Architecture

The extension is built with a modular architecture:

### Agent Module
- **agent/agent.ts**: Core agent implementation using Claude 3 Sonnet
- **agent/tools/**: Browser automation tools organized by functionality
  - **navigationTools.ts**: Browser navigation functions
  - **interactionTools.ts**: User interaction functions (click, type)
  - **observationTools.ts**: Page observation functions (screenshot, DOM access)
  - **mouseTools.ts**: Mouse movement and interaction
  - **keyboardTools.ts**: Keyboard input functions
  - **tabTools.ts**: Tab management functions

### Background Module
- **background/index.ts**: Entry point for the background script
- **background/tabManager.ts**: Tab attachment and management
- **background/agentController.ts**: Agent initialization and execution
- **background/streamingManager.ts**: Streaming functionality
- **background/messageHandler.ts**: Message routing and handling

### UI Components
- **sidepanel/SidePanel.tsx**: Side panel UI for interacting with the extension
- **options/Options.tsx**: Options page for configuring the extension

## Installation

1. Clone this repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory

## Usage

1. Click the BrowserBee icon in your browser toolbar to open the side panel
2. Enter your instructions in natural language (e.g., "go to google.com, search for Cicero, and click on the first result")
3. Click "Execute" to run your instructions

## Development

- `npm run dev`: Start the development server
- `npm run build`: Build the extension for production

## Configuration

You'll need to provide your own Anthropic API key in the extension options page.

## Limitations

- Works best in a single Chrome window
- Some websites may block browser automation

## License

[MIT](LICENSE)

## Acknowledgements

BrowserBee is built using these amazing open source projects:

- [Cline](https://github.com/cline/cline) enabled us to vibe-code the first version of BrowserBee and inspired us to build a "Cline for the web" in the first place
- [playwright-crx](https://github.com/ruifigueira/playwright-crx) by [@ruifigueira](https://github.com/ruifigueira) for in-browser use of Playwright
- [playwright-mcp](https://github.com/microsoft/playwright-mcp) for the browser tool implementations
