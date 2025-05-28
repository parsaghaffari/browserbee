import { ExecutionEngine, ExecutionCallbacks } from '../../../src/agent/ExecutionEngine';
import { createMockProvider } from '../../mocks/providers';
import { createMockPage } from '../../mocks/playwright';
import { ToolManager } from '../../../src/agent/ToolManager';
import { PromptManager } from '../../../src/agent/PromptManager';
import { MemoryManager } from '../../../src/agent/MemoryManager';
import { ErrorHandler } from '../../../src/agent/ErrorHandler';
import { BrowserTool } from '../../../src/agent/tools/types';

// Mock dependencies
jest.mock('../../../src/tracking/tokenTrackingService', () => ({
  TokenTrackingService: {
    getInstance: jest.fn().mockReturnValue({
      trackInputTokens: jest.fn(),
      trackOutputTokens: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/agent/approvalManager', () => ({
  requestApproval: jest.fn().mockResolvedValue(true),
}));

describe('ExecutionEngine', () => {
  let executionEngine: ExecutionEngine;
  let mockProvider: any;
  let mockPage: any;
  let toolManager: ToolManager;
  let promptManager: PromptManager;
  let memoryManager: MemoryManager;
  let errorHandler: ErrorHandler;
  let mockTools: BrowserTool[];
  let mockToolFunctions: jest.MockedFunction<any>[];

  beforeEach(() => {
    mockProvider = createMockProvider();
    mockPage = createMockPage();
    
    // Create mock tool functions
    mockToolFunctions = [
      jest.fn().mockResolvedValue('Screenshot taken successfully'),
      jest.fn().mockResolvedValue('Navigation completed'),
      jest.fn().mockResolvedValue('Element clicked'),
    ];
    
    // Create mock tools with proper Jest mocks
    mockTools = [
      {
        name: 'browser_screenshot',
        description: 'Take a screenshot of the current page',
        func: mockToolFunctions[0],
      },
      {
        name: 'browser_navigate',
        description: 'Navigate to a URL',
        func: mockToolFunctions[1],
      },
      {
        name: 'browser_click',
        description: 'Click an element',
        func: mockToolFunctions[2],
      },
    ];

    // Initialize components
    toolManager = new ToolManager(mockPage, mockTools);
    promptManager = new PromptManager(mockTools);
    memoryManager = new MemoryManager(mockTools);
    errorHandler = new ErrorHandler();

    executionEngine = new ExecutionEngine(
      mockProvider,
      toolManager,
      promptManager,
      memoryManager,
      errorHandler
    );

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with all required components', () => {
      expect(executionEngine).toBeInstanceOf(ExecutionEngine);
    });
  });

  describe('executePrompt', () => {
    let mockCallbacks: ExecutionCallbacks;

    beforeEach(() => {
      mockCallbacks = {
        onLlmChunk: jest.fn(),
        onLlmOutput: jest.fn(),
        onToolOutput: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onSegmentComplete: jest.fn(),
        onFallbackStarted: jest.fn(),
      };
    });

    it('should execute a simple prompt without tools', async () => {
      // Mock provider to return simple text response
      const mockStream = (async function* () {
        yield { type: 'text', text: 'Hello, this is a simple response.' };
        yield { type: 'usage', inputTokens: 10, outputTokens: 8 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      await executionEngine.executePrompt('Hello', mockCallbacks, [], false);

      expect(mockCallbacks.onLlmOutput).toHaveBeenCalledWith('Hello, this is a simple response.');
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle tool calls in the response', async () => {
      // Mock provider to return response with tool call
      const mockStream = (async function* () {
        yield { type: 'text', text: 'I\'ll take a screenshot for you.\n\n<tool>browser_screenshot</tool>\n<input>{}</input>\n<requires_approval>false</requires_approval>' };
        yield { type: 'usage', inputTokens: 15, outputTokens: 25 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      await executionEngine.executePrompt('Take a screenshot', mockCallbacks, [], false);

      expect(mockCallbacks.onToolOutput).toHaveBeenCalledWith('🕹️ tool: browser_screenshot | args: {}');
      // The tool function is called with input and undefined context for non-approval tools
      expect(mockToolFunctions[0]).toHaveBeenCalledWith('{}', undefined);
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle tool calls requiring approval', async () => {
      // Mock provider to return response with tool call requiring approval
      const mockStream = (async function* () {
        yield { type: 'text', text: 'I\'ll click the purchase button.\n\n<tool>browser_click</tool>\n<input>button[data-action="purchase"]</input>\n<requires_approval>true</requires_approval>' };
        yield { type: 'usage', inputTokens: 20, outputTokens: 30 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      // Mock chrome.tabs.query
      (global as any).chrome.tabs.query.mockResolvedValue([{ id: 123 }]);

      await executionEngine.executePrompt('Click the purchase button', mockCallbacks, [], false);

      expect(mockCallbacks.onToolOutput).toHaveBeenCalledWith('🕹️ tool: browser_click | args: button[data-action="purchase"]');
      expect(mockCallbacks.onToolOutput).toHaveBeenCalledWith('⚠️ This action requires approval: The AI assistant has determined this action requires your approval.');
      expect(mockCallbacks.onToolOutput).toHaveBeenCalledWith('✅ Action approved by user. Executing...');
      expect(mockToolFunctions[2]).toHaveBeenCalledWith('button[data-action="purchase"]', {
        requiresApproval: true,
        approvalReason: 'The AI assistant has determined this action requires your approval.',
      });
    });

    it('should handle incomplete tool calls gracefully', async () => {
      // Mock provider to return incomplete tool call
      const mockStream = (async function* () {
        yield { type: 'text', text: 'I\'ll take a screenshot.\n\n<tool>browser_screenshot</tool>\n<input>{}</input>' };
        yield { type: 'usage', inputTokens: 15, outputTokens: 20 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      await executionEngine.executePrompt('Take a screenshot', mockCallbacks, [], false);

      // The execution engine should continue and add a message about the incomplete tool call
      expect(mockCallbacks.onLlmOutput).toHaveBeenCalled();
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle unknown tools gracefully', async () => {
      // Mock provider to return response with unknown tool
      const mockStream = (async function* () {
        yield { type: 'text', text: 'I\'ll use an unknown tool.\n\n<tool>unknown_tool</tool>\n<input>test</input>\n<requires_approval>false</requires_approval>' };
        yield { type: 'usage', inputTokens: 15, outputTokens: 20 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      await executionEngine.executePrompt('Use unknown tool', mockCallbacks, [], false);

      // Should continue execution and provide error message about unknown tool
      expect(mockCallbacks.onLlmOutput).toHaveBeenCalled();
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle execution cancellation', async () => {
      // Mock provider to return a long response
      const mockStream = (async function* () {
        yield { type: 'text', text: 'Starting long operation...' };
        // Simulate cancellation during execution
        errorHandler.cancel();
        yield { type: 'text', text: 'This should not be processed' };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      await executionEngine.executePrompt('Long operation', mockCallbacks, [], false);

      expect(mockCallbacks.onLlmOutput).toHaveBeenCalledWith(expect.stringContaining('Execution cancelled by user'));
    });

    it('should handle streaming mode', async () => {
      const mockStream = (async function* () {
        yield { type: 'text', text: 'Hello' };
        yield { type: 'text', text: ' world' };
        yield { type: 'text', text: '!' };
        yield { type: 'usage', inputTokens: 5, outputTokens: 3 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      await executionEngine.executePrompt('Hello', mockCallbacks, [], true);

      expect(mockCallbacks.onLlmChunk).toHaveBeenCalledWith('Hello');
      expect(mockCallbacks.onLlmChunk).toHaveBeenCalledWith(' world');
      expect(mockCallbacks.onLlmChunk).toHaveBeenCalledWith('!');
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle initial messages correctly', async () => {
      const mockStream = (async function* () {
        yield { type: 'text', text: 'Continuing conversation...' };
        yield { type: 'usage', inputTokens: 20, outputTokens: 5 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      const initialMessages = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
      ];

      await executionEngine.executePrompt('Continue', mockCallbacks, initialMessages, false);

      expect(mockProvider.createMessage).toHaveBeenCalledWith(
        expect.any(String), // system prompt
        expect.arrayContaining([
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
          { role: 'user', content: 'Continue' },
        ]),
        expect.any(Array) // tools
      );
    });
  });

  describe('executePromptWithFallback', () => {
    let mockCallbacks: ExecutionCallbacks;

    beforeEach(() => {
      mockCallbacks = {
        onLlmChunk: jest.fn(),
        onLlmOutput: jest.fn(),
        onToolOutput: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onSegmentComplete: jest.fn(),
        onFallbackStarted: jest.fn(),
      };

      // Mock ErrorHandler methods
      jest.spyOn(errorHandler, 'isStreamingSupported').mockResolvedValue(true);
      jest.spyOn(errorHandler, 'isRetryableError').mockReturnValue(false);
    });

    it('should execute normally when no errors occur', async () => {
      const mockStream = (async function* () {
        yield { type: 'text', text: 'Normal execution' };
        yield { type: 'usage', inputTokens: 10, outputTokens: 5 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      await executionEngine.executePromptWithFallback('Test', mockCallbacks);

      expect(mockCallbacks.onLlmOutput).toHaveBeenCalledWith('Normal execution');
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
      expect(mockCallbacks.onFallbackStarted).not.toHaveBeenCalled();
    });

    it('should trigger fallback on streaming errors', async () => {
      // First call fails, second call succeeds
      let callCount = 0;
      mockProvider.createMessage.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Streaming failed');
        }
        return (async function* () {
          yield { type: 'text', text: 'Fallback execution' };
          yield { type: 'usage', inputTokens: 10, outputTokens: 5 };
        })();
      });

      await executionEngine.executePromptWithFallback('Test', mockCallbacks);

      expect(mockCallbacks.onFallbackStarted).toHaveBeenCalled();
      expect(mockCallbacks.onLlmOutput).toHaveBeenCalledWith('Fallback execution');
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle retryable errors with backoff', async () => {
      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      // Mock ErrorHandler to recognize this as retryable
      jest.spyOn(errorHandler, 'isRetryableError').mockReturnValue(true);
      jest.spyOn(errorHandler, 'calculateBackoffTime').mockReturnValue(100);

      let callCount = 0;
      mockProvider.createMessage.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw rateLimitError;
        }
        return (async function* () {
          yield { type: 'text', text: 'Retry successful' };
          yield { type: 'usage', inputTokens: 10, outputTokens: 5 };
        })();
      });

      await executionEngine.executePromptWithFallback('Test', mockCallbacks);

      expect(mockCallbacks.onFallbackStarted).toHaveBeenCalled();
      expect(mockCallbacks.onLlmOutput).toHaveBeenCalledWith('Retry successful');
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('HTML entity decoding', () => {
    it('should decode HTML entities in responses', async () => {
      const mockStream = (async function* () {
        yield { type: 'text', text: 'Response with \\u003chtml\\u003e entities' };
        yield { type: 'usage', inputTokens: 10, outputTokens: 8 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      const mockCallbacks: ExecutionCallbacks = {
        onLlmOutput: jest.fn(),
        onToolOutput: jest.fn(),
        onComplete: jest.fn(),
      };

      await executionEngine.executePrompt('Test', mockCallbacks, [], false);

      expect(mockCallbacks.onLlmOutput).toHaveBeenCalledWith('Response with <html> entities');
    });
  });

  describe('Token tracking', () => {
    it('should track token usage correctly', async () => {
      const mockStream = (async function* () {
        yield { type: 'text', text: 'Response' };
        yield { type: 'usage', inputTokens: 15, outputTokens: 10, cacheReadTokens: 5 };
      })();
      mockProvider.createMessage.mockReturnValue(mockStream);

      const mockCallbacks: ExecutionCallbacks = {
        onLlmOutput: jest.fn(),
        onToolOutput: jest.fn(),
        onComplete: jest.fn(),
      };

      await executionEngine.executePrompt('Test', mockCallbacks, [], false);

      const { TokenTrackingService } = require('../../../src/tracking/tokenTrackingService');
      const tokenTracker = TokenTrackingService.getInstance();
      
      expect(tokenTracker.trackInputTokens).toHaveBeenCalledWith(15, { read: 5, write: undefined });
      expect(tokenTracker.trackOutputTokens).toHaveBeenCalledWith(10);
    });
  });
});
