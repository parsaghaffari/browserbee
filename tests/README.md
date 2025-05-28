# BrowserBee Test Suite Documentation

## Overview

This document describes the test suite structure, configuration, and development practices for the BrowserBee browser automation extension. The test suite provides comprehensive coverage with **467 passing tests** across **16 test suites**.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test -- PageContextManager.test.ts PromptManager.test.ts MemoryManager.test.ts TokenManager.test.ts ToolManager.test.ts
npm test -- memoryTools.test.ts tabTools.test.ts
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
    │   ├── AgentCore.test.ts           # Core agent functionality
    │   ├── ExecutionEngine.test.ts     # LLM execution engine
    │   ├── MemoryManager.test.ts       # Memory lookup and integration
    │   ├── PageContextManager.test.ts  # Page context management
    │   ├── PromptManager.test.ts       # System prompt generation
    │   ├── TokenManager.test.ts        # Token estimation and history trimming
    │   ├── ToolManager.test.ts         # Tool management and health checking
    │   └── tools/
    │       ├── interactionTools.test.ts    # Click, fill, select tools
    │       ├── keyboardTools.test.ts       # Keyboard input tools
    │       ├── memoryTools.test.ts         # Memory storage and retrieval
    │       ├── mouseTools.test.ts          # Mouse operation tools
    │       ├── navigationTools.test.ts     # Page navigation tools
    │       ├── observationTools.test.ts    # Screenshot, content tools
    │       └── tabTools.test.ts            # Tab management tools
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
- **Navigator API**: Cross-platform user agent detection

## Test Categories

### Agent Core Tests
Located in `tests/unit/agent/`

**Agent Core** (`AgentCore.test.ts`)
- Agent initialization and lifecycle
- Tool execution coordination
- State management and error propagation
- Integration with PageContextManager and PromptManager

**Execution Engine** (`ExecutionEngine.test.ts`)
- LLM prompt processing and streaming response handling
- Tool call parsing and execution
- Token usage tracking and retry logic
- Error recovery and fallback mechanisms

**Memory Manager** (`MemoryManager.test.ts`)
- Memory tool initialization and discovery
- Domain-based memory lookup and retrieval
- Message context integration with proper formatting
- Tool sequence visualization and workflow patterns
- Error handling for invalid JSON and missing tools
- Performance testing with large memory datasets

**Page Context Manager** (`PageContextManager.test.ts`)
- Singleton pattern implementation and enforcement
- Page context switching and management
- Helper function integration and testing
- Memory management and cleanup
- Concurrent access patterns and edge cases

**Prompt Manager** (`PromptManager.test.ts`)
- Dynamic system prompt generation with tool descriptions
- Page context embedding and integration
- OS-specific keyboard shortcut detection (macOS, Windows, Linux)
- Tool management and updates
- Performance optimization and memory leak validation

**Token Manager** (`TokenManager.test.ts`)
- Token estimation using character-based approximation
- Context token counting for message arrays
- Intelligent message history trimming with user message preservation
- Custom and default token limit enforcement
- Performance optimization for large datasets
- Integration workflows for complete token management

**Tool Manager** (`ToolManager.test.ts`)
- Tool initialization and wrapping with health check behavior
- Tab vs non-tab tool identification and differential handling
- Connection health monitoring and automatic recovery
- Smart error handling with context-aware messages
- Tool metadata preservation during wrapping
- Performance optimization for large tool sets
- Integration scenarios with mixed tool execution
- Error message specificity for different tool types
- Memory management and concurrent execution support

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

**Memory Tools** (`memoryTools.test.ts`)
- Memory storage and retrieval for task automation
- Domain-based memory organization
- Memory validation and error handling
- Memory lifecycle management (save, lookup, delete, clear)
- Domain normalization and consistency

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

**Tab Tools** (`tabTools.test.ts`)
- Tab creation and management
- Tab switching and selection
- Tab listing and organization
- Tab closing and cleanup
- Window management integration

### Background Services Tests

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

## Test Coverage Summary

| Test Suite | Tests | Coverage Areas |
|------------|-------|----------------|
| **Agent Core** | | |
| AgentCore.test.ts | 15 tests | Core agent functionality, tool coordination |
| ExecutionEngine.test.ts | 18 tests | LLM execution, streaming, token tracking |
| MemoryManager.test.ts | 28 tests | Memory lookup, integration, error handling |
| PageContextManager.test.ts | 29 tests | Page context management, singleton pattern |
| PromptManager.test.ts | 29 tests | System prompt generation, OS detection |
| TokenManager.test.ts | 29 tests | Token estimation, history trimming, context management |
| ToolManager.test.ts | 46 tests | Tool management, health checking, error handling |
| **Agent Tools** | | |
| interactionTools.test.ts | 45 tests | Element interaction, form handling |
| keyboardTools.test.ts | 42 tests | Keyboard input, key combinations |
| memoryTools.test.ts | 35 tests | Memory storage, domain management |
| mouseTools.test.ts | 38 tests | Mouse operations, coordinates |
| navigationTools.test.ts | 25 tests | Page navigation, history |
| observationTools.test.ts | 55 tests | Screenshots, content extraction |
| tabTools.test.ts | 21 tests | Tab management, window operations |
| **Background Services** | | |
| configManager.test.ts | 8 tests | Configuration management |
| **Model Providers** | | |
| factory.test.ts | 4 tests | Provider instantiation |

**Total: 467 tests across 16 test suites**

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

**Integration Testing Pattern**
```typescript
it('should handle complete workflow', async () => {
  const tool1 = createTool1(mockPage);
  const tool2 = createTool2(mockPage);

  // Setup mock chain
  mockPage.method1.mockResolvedValue(result1);
  mockPage.method2.mockResolvedValue(result2);

  // Execute workflow
  const result1 = await tool1.func(input1);
  const result2 = await tool2.func(input2);

  // Verify workflow
  expect(result1).toBe(expectedResult1);
  expect(result2).toBe(expectedResult2);
});
```

**Singleton Testing Pattern**
```typescript
it('should maintain singleton pattern', () => {
  const instance1 = Manager.getInstance();
  const instance2 = Manager.getInstance();

  expect(instance1).toBe(instance2);
  expect(instance1).toBeInstanceOf(Manager);
});
```

**Cross-Platform Testing Pattern**
```typescript
it('should detect platform correctly', () => {
  // Mock different user agents
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    writable: true
  });

  const result = detectPlatform();
  expect(result).toContain('Windows');
});
```

**Memory Manager Testing Pattern**
```typescript
it('should handle memory lookup workflow', async () => {
  const mockMemories = [
    {
      taskDescription: 'Login to website',
      toolSequence: ['browser_click', 'browser_type', 'browser_click']
    }
  ];

  mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(mockMemories)) as any;

  await memoryManager.lookupMemories('example.com', messages);

  expect(messages).toHaveLength(1);
  expect(messages[0].content).toContain('I found 1 memories for example.com');
  expect(messages[0].content).toContain('browser_click → browser_type → browser_click');
});
```

**Token Manager Testing Pattern**
```typescript
it('should handle token estimation and trimming', () => {
  // Test token estimation
  expect(approxTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75, ceil = 3

  // Test message trimming
  const messages = [
    { role: 'user', content: 'request' },
    { role: 'assistant', content: 'a'.repeat(4000) }, // Large response
    { role: 'user', content: 'follow up' }
  ];

  const trimmed = trimHistory(messages, 100);
  
  // Should preserve user messages
  const userMessages = trimmed.filter(m => m.role === 'user');
  expect(userMessages.length).toBe(2);
  expect(contextTokenCount(trimmed)).toBeLessThanOrEqual(100);
});
```

**Tool Manager Testing Pattern**
```typescript
it('should handle tool health check wrapping', async () => {
  const mockTools = [
    {
      name: 'browser_navigate',
      description: 'Navigate to a URL',
      func: jest.fn(async (input: string) => 'Navigation successful')
    },
    {
      name: 'browser_tab_new',
      description: 'Create a new tab',
      func: jest.fn(async (input: string) => 'New tab created')
    }
  ];

  const toolManager = new ToolManager(mockPage, mockTools);
  
  // Test healthy connection
  mockPage.evaluate.mockResolvedValue(true);
  const navigateTool = toolManager.findTool('browser_navigate');
  const result = await navigateTool!.func('https://example.com');
  
  expect(result).toBe('Navigation successful');
  expect(mockPage.evaluate).toHaveBeenCalled(); // Health check performed
  
  // Test tab tool bypass
  const tabTool = toolManager.findTool('browser_tab_new');
  const tabResult = await tabTool!.func('https://example.com');
  
  expect(tabResult).toBe('New tab created');
  // Tab tools should not trigger health checks
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
6. **Add comprehensive test categories**:
   - Constructor/initialization tests
   - Core functionality tests
   - Integration scenario tests
   - Edge case and error handling tests
   - Memory and performance tests

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
- Ensure proper TypeScript typing with `as any` when needed

### Enhanced Mock Features
- **Navigator mocking**: Cross-platform user agent simulation
- **Console mocking**: Capture and verify logging output
- **Error simulation**: Realistic error scenarios for robust testing
- **State management**: Proper cleanup and isolation between tests

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
- **TypeScript errors**: Use proper type annotations or `as any` for mock functions
- **Navigator undefined**: Ensure navigator is properly mocked in global scope

### Debug Commands
```bash
# Run specific test file
npm test -- PageContextManager.test.ts

# Run tests with verbose output
npm test -- --verbose

# Run single test
npm test -- --testNamePattern="should handle singleton pattern"

# Run tests for specific category
npm test -- --testPathPattern="agent"
npm test -- --testPathPattern="tools"
```

## Performance Considerations

- Tests run in parallel by default
- Mocks prevent external network calls
- Use `beforeEach` for setup to ensure test isolation
- Keep test data small and focused
- Average test execution time: ~5 seconds for full suite
- Memory management tests ensure no leaks in core components

## Continuous Integration

The test suite is designed to run in CI environments:
- No external dependencies required
- Deterministic results
- Fast execution (typically < 10 seconds)
- Clear error reporting
- Comprehensive coverage of core functionality
- Cross-platform compatibility testing

## Test Quality Metrics

### Coverage Areas
- **Unit Testing**: Individual component functionality
- **Integration Testing**: Component interaction workflows
- **Edge Case Testing**: Error scenarios and boundary conditions
- **Performance Testing**: Memory leaks and execution efficiency
- **Cross-Platform Testing**: OS-specific behavior validation

### Quality Assurance
- All 467 tests consistently passing
- Comprehensive error handling validation
- Memory leak prevention testing
- Performance optimization verification
- Cross-platform compatibility assurance

## Future Enhancements

Areas for test suite expansion:
- End-to-end testing with real browser instances
- Performance benchmarking tests
- Security and input validation testing
- Cross-browser compatibility testing
- Integration testing with real LLM providers (in isolated environment)
- Visual regression testing for UI components
- Load testing for concurrent operations
- Additional Agent Core component testing (ErrorHandler, approvalManager, etc.)
- Background service integration testing
- Extension lifecycle testing
