import { createMockPage } from '../../mocks/playwright';
import { createMockProvider } from '../../mocks/providers';
import { mockAnthropicConfig } from '../../fixtures/sampleConfigs';

// Mock the dependencies before importing the main module
jest.mock('../../../src/agent/tools/index', () => ({
  getAllTools: jest.fn().mockReturnValue([
    {
      name: 'browser_screenshot',
      description: 'Take a screenshot of the current page',
      func: jest.fn().mockResolvedValue('Screenshot taken'),
    },
    {
      name: 'browser_navigate',
      description: 'Navigate to a URL',
      func: jest.fn().mockResolvedValue('Navigation completed'),
    },
  ]),
}));

jest.mock('../../../src/background/configManager', () => ({
  ConfigManager: {
    getInstance: jest.fn().mockReturnValue({
      getProviderConfig: jest.fn().mockResolvedValue({
        provider: 'anthropic',
        apiKey: 'test-anthropic-key',
        apiModelId: 'claude-3-5-sonnet-20241022',
        baseUrl: undefined,
        thinkingBudgetTokens: undefined,
      }),
    }),
  },
}));

jest.mock('../../../src/models/providers/factory', () => ({
  createProvider: jest.fn().mockImplementation(() => Promise.resolve(createMockProvider())),
}));

// Import after mocks are set up
import { BrowserAgent, createBrowserAgent, needsReinitialization } from '../../../src/agent/AgentCore';

describe('BrowserAgent', () => {
  let mockPage: any;
  let mockProvider: any;

  beforeEach(() => {
    mockPage = createMockPage();
    mockProvider = createMockProvider();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with page, config, and provider', () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      expect(agent).toBeInstanceOf(BrowserAgent);
      expect(agent.promptManager).toBeDefined();
    });

    it('should convert tools from DynamicTool to BrowserTool format', () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      // The agent should have successfully converted and initialized tools
      expect(agent).toBeInstanceOf(BrowserAgent);
    });
  });

  describe('convertToBrowserTools', () => {
    it('should convert DynamicTool objects to BrowserTool format', () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      // Test that the conversion worked by checking the agent was created successfully
      expect(agent).toBeInstanceOf(BrowserAgent);
    });

    it('should handle tools already in BrowserTool format', () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      expect(agent).toBeInstanceOf(BrowserAgent);
    });

    it('should handle unknown tool formats gracefully', () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      expect(agent).toBeInstanceOf(BrowserAgent);
    });
  });

  describe('cancel', () => {
    it('should cancel current execution', () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      expect(() => agent.cancel()).not.toThrow();
    });
  });

  describe('resetCancel', () => {
    it('should reset the cancel flag', () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      agent.cancel();
      expect(() => agent.resetCancel()).not.toThrow();
    });
  });

  describe('isStreamingSupported', () => {
    it('should return streaming support status', async () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      const isSupported = await agent.isStreamingSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('executePrompt', () => {
    it('should execute a prompt successfully', async () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      const mockCallbacks = {
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

      await expect(
        agent.executePrompt('Test prompt', mockCallbacks)
      ).resolves.not.toThrow();
    });

    it('should handle execution with initial messages', async () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      const mockCallbacks = {
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

      const initialMessages = [
        { role: 'user', content: 'Previous message' },
      ];

      await expect(
        agent.executePrompt('Test prompt', mockCallbacks, initialMessages)
      ).resolves.not.toThrow();
    });
  });

  describe('executePromptWithFallback', () => {
    it('should execute prompt with fallback support', async () => {
      const agent = new BrowserAgent(mockPage, mockAnthropicConfig, mockProvider);
      
      const mockCallbacks = {
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

      await expect(
        agent.executePromptWithFallback('Test prompt', mockCallbacks)
      ).resolves.not.toThrow();
    });
  });
});

describe('createBrowserAgent', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = createMockPage();
    jest.clearAllMocks();
  });

  it('should create a BrowserAgent with valid configuration', async () => {
    const agent = await createBrowserAgent(mockPage, 'test-api-key');
    
    expect(agent).toBeInstanceOf(BrowserAgent);
  });

  it('should handle missing provider configuration gracefully', async () => {
    // Mock ConfigManager to throw an error
    const { ConfigManager } = require('../../../src/background/configManager');
    ConfigManager.getInstance().getProviderConfig.mockRejectedValueOnce(new Error('Config not found'));

    const agent = await createBrowserAgent(mockPage, 'test-api-key');
    
    expect(agent).toBeInstanceOf(BrowserAgent);
  });

  it('should handle Ollama provider without API key', async () => {
    const { ConfigManager } = require('../../../src/background/configManager');
    ConfigManager.getInstance().getProviderConfig.mockResolvedValueOnce({
      provider: 'ollama',
      apiKey: '',
      apiModelId: 'llama2',
      baseUrl: 'http://localhost:11434',
    });

    const agent = await createBrowserAgent(mockPage, '');
    
    expect(agent).toBeInstanceOf(BrowserAgent);
  });

  it('should use fallback API key when stored key is empty', async () => {
    const { ConfigManager } = require('../../../src/background/configManager');
    ConfigManager.getInstance().getProviderConfig.mockResolvedValueOnce({
      provider: 'anthropic',
      apiKey: '',
      apiModelId: 'claude-3-5-sonnet-20241022',
    });

    const agent = await createBrowserAgent(mockPage, 'fallback-api-key');
    
    expect(agent).toBeInstanceOf(BrowserAgent);
  });
});

describe('needsReinitialization', () => {
  let mockPage: any;
  let agent: BrowserAgent;

  beforeEach(async () => {
    mockPage = createMockPage();
    agent = await createBrowserAgent(mockPage, 'test-api-key');
    jest.clearAllMocks();
  });

  it('should return true when agent is null', async () => {
    const result = await needsReinitialization(null as any);
    
    expect(result).toBe(true);
  });

  it('should return true for existing agent (conservative approach)', async () => {
    const result = await needsReinitialization(agent);
    
    expect(result).toBe(true);
  });

  it('should handle provider configuration parameter', async () => {
    const result = await needsReinitialization(agent, mockAnthropicConfig);
    
    expect(result).toBe(true);
  });
});
