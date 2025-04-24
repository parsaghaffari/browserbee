# Contributing to BrowserBee

Thank you for your interest in contributing to BrowserBee! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/browserbee.git`
3. Install dependencies: `npm install`
4. Create a branch for your changes: `git checkout -b feature/your-feature-name`

## Development Workflow

1. Make your changes
2. Run the development server: `npm run dev`
3. Test your changes in Chrome
4. Build the extension: `npm run build`
5. Load the extension in Chrome from the `dist` directory

## Project Structure

The project is organized into several modules:

- **agent**: Core agent implementation and browser automation tools
- **background**: Background script for the Chrome extension
- **sidepanel**: UI for the side panel
- **options**: UI for the options page

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

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [Apache 2.0 License](LICENSE).
