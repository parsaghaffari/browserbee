---
sidebar_position: 4
---

# Contributing Guide

Thank you for your interest in contributing to BrowserBee! This guide will help you get started with contributing to the project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## Getting Started

1. Fork the repository
   ```bash
   # Clone your fork
   git clone https://github.com/yourusername/browserbee.git
   cd browserbee
   
   # Install dependencies
   npm install
   
   # Create a branch for your changes
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Make your changes to the codebase
2. Run the development server to test your changes
   ```bash
   npm run dev
   ```
3. Test your changes in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory
4. Build the extension for production
   ```bash
   npm run build
   ```

## Project Structure

The project is organized into several modules:

### Agent Module

The Agent Module processes user instructions and executes browser automation tasks:

- `src/agent/AgentCore.ts`: Main agent class
- `src/agent/TokenManager.ts`: Token estimation and history trimming
- `src/agent/ToolManager.ts`: Tool wrapping with health checks
- `src/agent/PromptManager.ts`: System prompt generation
- `src/agent/MemoryManager.ts`: Memory lookup and integration
- `src/agent/ErrorHandler.ts`: Cancellation and error handling
- `src/agent/ExecutionEngine.ts`: Streaming and non-streaming execution
- `src/agent/approvalManager.ts`: Handles user approval for sensitive actions

### Background Module

The Background Module manages the extension's background processes:

- `src/background/index.ts`: Entry point for the background script
- `src/background/tabManager.ts`: Tab attachment and management
- `src/background/agentController.ts`: Agent initialization and execution
- `src/background/streamingManager.ts`: Streaming functionality
- `src/background/messageHandler.ts`: Message routing and handling
- `src/background/configManager.ts`: Provider configuration management

### UI Module

The UI Module provides the user interface for interacting with the extension:

- `src/sidepanel/`: Side panel UI components
- `src/options/`: Options page UI components

### Models Module

The Models Module provides a flexible interface for multiple LLM providers:

- `src/models/providers/`: LLM provider implementations

## Pull Request Process

1. Ensure your code follows the project's coding style
2. Update documentation if necessary
3. Test your changes thoroughly
4. Submit a pull request with a clear description of your changes

## Coding Guidelines

- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments for new functions and classes
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility

## Testing

- Test your changes in Chrome
- Ensure the extension builds without errors
- Verify that your changes don't break existing functionality

## Documentation

- Update the README.md if you add new features
- Add JSDoc comments to your code
- Document any non-obvious behavior
- Consider updating the documentation in the `docs` directory

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [Apache 2.0 License](https://github.com/parsaghaffari/browserbee/blob/main/LICENSE).
