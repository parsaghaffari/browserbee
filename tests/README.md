# BrowserBee Test Suite Documentation

## Overview

This document describes the test suite structure, configuration, and development practices for the BrowserBee browser automation extension.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
tests/
├── setup/
│   └── setupTests.ts              # Global test configuration
├── mocks/
│   ├── playwright.ts              # Playwright/browser API mocks
│   └── providers.ts               # LLM provider mocks
├── fixtures/
│   ├── sampleConfigs.ts           # Test configuration data
│   ├── sampleMessages.ts          # Test message data
│   └── toolTestData.ts            # Tool-specific test data
└── unit/
    ├── agent/
    │   ├── AgentCore.test.ts       # Core agent functionality
    │   ├── ExecutionEngine.test.ts # LLM execution engine
    │   └── tools/
    │       ├── interactionTools.test.ts    # Click, fill, select tools
    │       ├── keyboardTools.test.ts       # Keyboard input tools
    │       ├── mouseTools.test.ts          # Mouse operation tools
    │       ├── navigationTools.test.ts     # Page navigation tools
    │       └── observationTools.test.ts    # Screenshot, content tools
    ├── background/
    │   └── configManager.test.ts   # Configuration management
    └── models/
        └── providers/
            └── factory.test.ts     # LLM provider factory
```

## Test Configuration

### Jest Setup
- **Framework**: Jest with TypeScript support
- **Environment**: Node.js with jsdom for DOM APIs
- **Module Resolution**: ES modules with path mapping
- **Setup Files**: `tests/setup/setupTests.ts` for global configuration

### Key Configuration Files
- `jest.config.js` - Main Jest configuration
- `tests/setup/setupTests.ts` - Global test environment setup
- `tsconfig.json` - TypeScript configuration (includes test paths)

## Mock System

### Browser API Mocking
The test suite uses comprehensive mocks for browser interactions:

```typescript
// Playwright page mocking
const mockPage = createMockPage();
mockPage.click.mockResolvedValue(undefined);

// Chrome extension API mocking
global.chrome = mockChromeAPIs;
```

### Available Mocks
- **Playwright APIs**: Complete page interaction simulation
- **Chrome Extension APIs**: Tab management, storage, messaging
- **LLM Providers**: Mock implementations for all supported providers
- **Page Context**: Realistic browser page state simulation

## Test Categories

### Agent Tools Tests
Located in `tests/unit/agent/tools/`

**Interaction Tools** (`interactionTools.test.ts`)
- Element clicking with CSS selectors
- Form filling and input handling
- Dropdown selection and option handling
- Error scenarios for invalid selectors

**Keyboard Tools** (`keyboardTools.test.ts`)
- Key press operations (single keys, combinations)
- Text typing with various character sets
- Special key handling (arrows, function keys, modifiers)
- Input validation and error handling

**Mouse Tools** (`mouseTools.test.ts`)
- Mouse movement and positioning
- Click operations at coordinates
- Drag and drop functionality
- Coordinate validation and edge cases

**Navigation Tools** (`navigationTools.test.ts`)
- Page navigation and URL handling
- Browser history operations (back, forward, reload)
- Tab management functionality
- Navigation error handling

**Observation Tools** (`observationTools.test.ts`)
- Screenshot capture and processing
- Page content extraction
- Element visibility detection
- Accessibility tree analysis

### Core Engine Tests

**Agent Core** (`AgentCore.test.ts`)
- Agent initialization and lifecycle
- Tool execution coordination
- State management
- Error propagation

**Execution Engine** (`ExecutionEngine.test.ts`)
- LLM prompt processing
- Streaming response handling
- Tool call parsing and execution
- Token usage tracking
- Retry logic and error recovery

### Configuration Tests

**Config Manager** (`configManager.test.ts`)
- Configuration loading and validation
- Provider-specific settings
- Default value handling
- Configuration persistence

### Model Provider Tests

**Provider Factory** (`factory.test.ts`)
- Provider instantiation
- Configuration validation
- Error handling for invalid providers
- Provider-specific feature support

## Writing New Tests

### Test File Structure
```typescript
import { jest } from '@jest/globals';
import { createMockPage, mockChromeAPIs } from '../../../mocks/playwright';

// Mock dependencies before importing
jest.mock('../../../../src/path/to/module', () => ({
  // Mock implementation
}));

// Import after mocking
import { functionToTest } from '../../../../src/path/to/module';

describe('Module Name', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = createMockPage();
    jest.clearAllMocks();
  });

  describe('functionToTest', () => {
    it('should handle normal case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Error scenario test
    });
  });
});
```

### Testing Patterns

**Tool Testing Pattern**
```typescript
it('should perform expected action', async () => {
  const tool = createTool(mockPage);
  mockPage.someMethod.mockResolvedValue(expectedResult);

  const result = await tool.func(input);

  expect(result).toBe(expectedOutput);
  expect(mockPage.someMethod).toHaveBeenCalledWith(expectedArgs);
});
```

**Error Testing Pattern**
```typescript
it('should handle errors gracefully', async () => {
  const tool = createTool(mockPage);
  mockPage.someMethod.mockRejectedValue(new Error('Test error'));

  const result = await tool.func(input);

  expect(result).toContain('Error');
});
```

### Using Fixtures
```typescript
import { mockConfigurations, mockErrorScenarios } from '../../fixtures/toolTestData';

// Use predefined test data
const config = mockConfigurations.anthropic;
const error = mockErrorScenarios.elementNotFound;
```

## Adding New Test Suites

1. **Create test file** in appropriate `tests/unit/` subdirectory
2. **Follow naming convention**: `ModuleName.test.ts`
3. **Import required mocks** from `tests/mocks/`
4. **Use fixtures** from `tests/fixtures/` for test data
5. **Follow established patterns** for consistency

## Mock Development

### Adding New Mocks
When adding new functionality that requires mocking:

1. **Update `tests/mocks/playwright.ts`** for browser API mocks
2. **Update `tests/mocks/providers.ts`** for LLM provider mocks
3. **Add test data to `tests/fixtures/`** for reusable test scenarios

### Mock Guidelines
- Keep mocks simple and focused
- Return realistic data structures
- Support both success and error scenarios
- Use Jest mock functions for call tracking

## Test Data Management

### Fixtures Organization
- `sampleConfigs.ts` - Configuration objects for different providers
- `sampleMessages.ts` - Message structures for testing communication
- `toolTestData.ts` - Tool-specific test scenarios and error conditions

### Adding Test Data
```typescript
// In appropriate fixture file
export const newTestScenario = {
  input: 'test input',
  expectedOutput: 'expected result',
  mockSetup: () => {
    // Mock configuration
  }
};
```

## Debugging Tests

### Common Issues
- **Mock not working**: Ensure mocks are imported before the module under test
- **Async issues**: Use `await` for all async operations in tests
- **State pollution**: Use `beforeEach` to reset mocks and state

### Debug Commands
```bash
# Run specific test file
npm test -- interactionTools.test.ts

# Run tests with verbose output
npm test -- --verbose

# Run single test
npm test -- --testNamePattern="should handle normal case"
```

## Performance Considerations

- Tests run in parallel by default
- Mocks prevent external network calls
- Use `beforeEach` for setup to ensure test isolation
- Keep test data small and focused

## Continuous Integration

The test suite is designed to run in CI environments:
- No external dependencies required
- Deterministic results
- Fast execution (typically < 2 seconds)
- Clear error reporting

## Future Enhancements

Areas for test suite expansion:
- End-to-end testing with real browser instances
- Performance benchmarking tests
- Security and input validation testing
- Cross-browser compatibility testing
- Integration testing with real LLM providers (in isolated environment)
