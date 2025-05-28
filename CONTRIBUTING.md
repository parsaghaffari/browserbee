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
3. **Run tests**: `npm test` (see Testing section below)
4. **Check code quality**: `npm run lint`
5. Test your changes in Chrome
6. Build the extension: `npm run build`
7. Load the extension in Chrome from the `dist` directory

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

## Testing & Quality Assurance

BrowserBee has a comprehensive testing infrastructure with **548 tests** across **18 test suites** to ensure code quality and reliability.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test files
npm test -- PageContextManager.test.ts
npm test -- --testPathPattern="agent/tools"
```

### Test Structure

Our test suite covers:

- **Agent Core Components** (275+ tests)
  - AgentCore, ExecutionEngine, MemoryManager
  - PageContextManager, PromptManager, TokenManager
  - ToolManager, ErrorHandler, approvalManager

- **Agent Tools** (260+ tests)
  - Browser interaction tools (click, type, navigate)
  - Observation tools (screenshots, content extraction)
  - Memory and tab management tools

- **Infrastructure** (13+ tests)
  - Configuration management
  - LLM provider factories

### Writing Tests

When adding new features, please:

1. **Follow existing patterns** - Check `tests/unit/` for examples
2. **Use provided mocks** - Import from `tests/mocks/`
3. **Add test data** - Use `tests/fixtures/` for reusable data
4. **Test error scenarios** - Include edge cases and error handling
5. **Maintain coverage** - Ensure new code is tested

#### Test File Structure
```typescript
import { jest } from '@jest/globals';
import { createMockPage } from '../../mocks/playwright';

describe('YourComponent', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = createMockPage();
    jest.clearAllMocks();
  });

  it('should handle normal operation', async () => {
    // Test implementation
  });

  it('should handle error scenarios', async () => {
    // Error testing
  });
});
```

### Code Quality Checks

Before submitting a PR, ensure:

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Run ESLint
npm run lint

# Fix auto-fixable ESLint issues
npm run lint:fix

# Run all quality checks
npm test && npm run lint && npx tsc --noEmit
```

## CI/CD Pipeline

BrowserBee uses **GitHub Actions** for automated testing and quality assurance.

### Automated Checks

Every push and pull request triggers:

- ✅ **ESLint** - Code style and quality checks
- ✅ **TypeScript** - Compilation validation
- ✅ **Jest Tests** - All 548 tests must pass
- ✅ **Build Verification** - Extension must build successfully
- ✅ **Multi-Node Testing** - Tests on Node.js 18 and 20

### CI/CD Workflow

1. **Push/PR created** → GitHub Actions triggered
2. **Quality gates** → All checks must pass
3. **Build artifacts** → Extension build saved (7 days)
4. **Status checks** → Green ✅ = ready to merge

### Branch Protection

- All CI checks must pass before merging
- Pull requests require review
- Direct pushes to main branch are protected

### Viewing CI Results

- Check the **Actions** tab in GitHub
- View detailed logs for any failures
- Build artifacts available for download

### Local CI Simulation

To run the same checks locally:

```bash
# Full CI simulation
npm ci                    # Clean install
npm run lint             # ESLint checks
npx tsc --noEmit        # TypeScript compilation
npm test                # All tests
npm run build           # Build verification
```

### Troubleshooting CI Failures

Common issues and solutions:

- **ESLint failures**: Run `npm run lint:fix`
- **TypeScript errors**: Check `npx tsc --noEmit` output
- **Test failures**: Run `npm test` locally to debug
- **Build failures**: Verify `npm run build` works locally

For detailed testing documentation, see [`tests/README.md`](tests/README.md).

## Documentation

- Update the README.md if you add new features
- Add JSDoc comments to your code
- Document any non-obvious behavior

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [Apache 2.0 License](LICENSE).
