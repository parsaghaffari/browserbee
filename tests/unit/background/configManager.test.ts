import { ConfigManager, ProviderConfig } from '../../../src/background/configManager';
import { 
  mockAnthropicConfig, 
  mockOpenAIConfig, 
  mockGeminiConfig, 
  mockOllamaConfig,
  invalidConfig 
} from '../../fixtures/sampleConfigs';

// Mock the provider modules to avoid ES module issues
jest.mock('../../../src/models/providers/anthropic', () => ({
  AnthropicProvider: {
    getAvailableModels: jest.fn().mockReturnValue([
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
    ]),
  },
}));

jest.mock('../../../src/models/providers/openai', () => ({
  OpenAIProvider: {
    getAvailableModels: jest.fn().mockReturnValue([
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ]),
  },
}));

jest.mock('../../../src/models/providers/gemini', () => ({
  GeminiProvider: {
    getAvailableModels: jest.fn().mockReturnValue([
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
    ]),
  },
}));

jest.mock('../../../src/models/providers/ollama', () => ({
  OllamaProvider: {
    getAvailableModels: jest.fn().mockReturnValue([
      { id: 'llama2', name: 'Llama 2' },
      { id: 'llama3.1', name: 'Llama 3.1' },
    ]),
  },
}));

jest.mock('../../../src/models/providers/openai-compatible', () => ({
  OpenAICompatibleProvider: {
    getAvailableModels: jest.fn().mockReturnValue([
      { id: 'custom-model', name: 'Custom Model' },
    ]),
  },
}));

// Mock Chrome storage API
const mockChromeStorage = {
  sync: {
    get: jest.fn(),
    set: jest.fn(),
  },
};

Object.defineProperty(global, 'chrome', {
  value: {
    storage: mockChromeStorage,
  },
  writable: true,
});

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = ConfigManager.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ConfigManager);
    });
  });

  describe('getProviderConfig', () => {
    it('should return stored provider configuration', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        provider: 'anthropic',
        anthropicApiKey: 'test-key',
        anthropicModelId: 'claude-3-5-sonnet-20241022',
        anthropicBaseUrl: '',
        thinkingBudgetTokens: 0,
      });

      const config = await configManager.getProviderConfig();

      expect(config).toEqual({
        provider: 'anthropic',
        apiKey: 'test-key',
        apiModelId: 'claude-3-5-sonnet-20241022',
        baseUrl: '',
        thinkingBudgetTokens: 0,
      });

      expect(mockChromeStorage.sync.get).toHaveBeenCalledWith({
        provider: 'anthropic',
        anthropicApiKey: '',
        anthropicModelId: 'claude-3-7-sonnet-20250219',
        anthropicBaseUrl: '',
        openaiApiKey: '',
        openaiModelId: 'gpt-4o',
        openaiBaseUrl: '',
        geminiApiKey: '',
        geminiModelId: 'gemini-1.5-pro',
        geminiBaseUrl: '',
        ollamaApiKey: '',
        ollamaModelId: '',
        ollamaBaseUrl: '',
        thinkingBudgetTokens: 0,
        openaiCompatibleApiKey: '',
        openaiCompatibleModelId: '',
        openaiCompatibleBaseUrl: '',
        openaiCompatibleModels: [],
      });
    });

    it('should return default configuration when no provider is set', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        provider: 'anthropic',
        anthropicApiKey: '',
        anthropicModelId: 'claude-3-7-sonnet-20250219',
        anthropicBaseUrl: '',
        thinkingBudgetTokens: 0,
      });

      const config = await configManager.getProviderConfig();

      expect(config).toEqual({
        provider: 'anthropic',
        apiKey: '',
        apiModelId: 'claude-3-7-sonnet-20250219',
        baseUrl: '',
        thinkingBudgetTokens: 0,
      });
    });

    it('should handle OpenAI configuration', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        provider: 'openai',
        openaiApiKey: 'openai-key',
        openaiModelId: 'gpt-4o',
        openaiBaseUrl: '',
      });

      const config = await configManager.getProviderConfig();

      expect(config).toEqual({
        provider: 'openai',
        apiKey: 'openai-key',
        apiModelId: 'gpt-4o',
        baseUrl: '',
      });
    });

    it('should handle Gemini configuration', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        provider: 'gemini',
        geminiApiKey: 'gemini-key',
        geminiModelId: 'gemini-2.5-flash-preview-05-20',
        geminiBaseUrl: '',
      });

      const config = await configManager.getProviderConfig();

      expect(config).toEqual({
        provider: 'gemini',
        apiKey: 'gemini-key',
        apiModelId: 'gemini-2.5-flash-preview-05-20',
        baseUrl: '',
      });
    });

    it('should handle Ollama configuration with base URL', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        provider: 'ollama',
        ollamaApiKey: 'dummy-key',
        ollamaModelId: 'llama2',
        ollamaBaseUrl: 'http://localhost:11434',
      });

      const config = await configManager.getProviderConfig();

      expect(config).toEqual({
        provider: 'ollama',
        apiKey: 'dummy-key',
        apiModelId: 'llama2',
        baseUrl: 'http://localhost:11434',
      });
    });

    it('should handle OpenAI-compatible configuration', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        provider: 'openai-compatible',
        openaiCompatibleApiKey: 'custom-key',
        openaiCompatibleModelId: 'custom-model',
        openaiCompatibleBaseUrl: 'https://api.custom.com/v1',
        openaiCompatibleModels: [{ id: 'custom-model', name: 'Custom Model' }],
      });

      const config = await configManager.getProviderConfig();

      expect(config).toEqual({
        provider: 'openai-compatible',
        apiKey: 'custom-key',
        apiModelId: 'custom-model',
        baseUrl: 'https://api.custom.com/v1',
        openaiCompatibleModels: [{ id: 'custom-model', name: 'Custom Model' }],
      });
    });

    it('should handle Chrome storage errors', async () => {
      mockChromeStorage.sync.get.mockRejectedValue(new Error('Storage error'));

      await expect(configManager.getProviderConfig()).rejects.toThrow('Storage error');
    });

    it('should throw error for unsupported provider', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        provider: 'unsupported',
      });

      await expect(configManager.getProviderConfig()).rejects.toThrow('Provider unsupported not supported');
    });
  });

  describe('saveProviderConfig', () => {
    it('should save configuration directly', async () => {
      mockChromeStorage.sync.set.mockResolvedValue(undefined);

      const config: Partial<ProviderConfig> = {
        provider: 'anthropic',
        apiKey: 'new-anthropic-key',
        apiModelId: 'claude-3-5-sonnet-20241022',
      };

      await configManager.saveProviderConfig(config);

      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({
        provider: 'anthropic',
        apiKey: 'new-anthropic-key',
        apiModelId: 'claude-3-5-sonnet-20241022',
      });
    });

    it('should handle Chrome storage errors during save', async () => {
      mockChromeStorage.sync.set.mockRejectedValue(new Error('Save error'));

      const config: Partial<ProviderConfig> = {
        provider: 'anthropic',
        apiKey: 'test-key',
      };

      await expect(configManager.saveProviderConfig(config)).rejects.toThrow('Save error');
    });
  });

  describe('getConfiguredProviders', () => {
    it('should return list of configured providers', async () => {
      // First call for getConfiguredProviders
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        anthropicApiKey: 'anthropic-key',
        openaiApiKey: 'openai-key',
        geminiApiKey: '',
        ollamaApiKey: '',
        openaiCompatibleApiKey: '',
        openaiCompatibleModels: [],
      });

      // Second call for getOllamaBaseUrl
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        ollamaBaseUrl: '',
      });

      // Third call for ollama custom models check
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        ollamaCustomModels: [],
      });

      const providers = await configManager.getConfiguredProviders();

      expect(providers).toEqual(['anthropic', 'openai']);
    });

    it('should include ollama when configured with models', async () => {
      // First call for getConfiguredProviders
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        anthropicApiKey: 'anthropic-key',
        openaiApiKey: '',
        geminiApiKey: '',
        ollamaApiKey: '',
        openaiCompatibleApiKey: '',
        openaiCompatibleModels: [],
      });

      // Second call for getOllamaBaseUrl
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        ollamaBaseUrl: 'http://localhost:11434',
      });

      // Third call for ollama custom models check
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        ollamaCustomModels: [{ id: 'llama2', name: 'Llama 2' }],
      });

      const providers = await configManager.getConfiguredProviders();

      expect(providers).toEqual(['anthropic', 'ollama']);
    });

    it('should return empty array when no providers are configured', async () => {
      // First call for getConfiguredProviders
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        anthropicApiKey: '',
        openaiApiKey: '',
        geminiApiKey: '',
        ollamaApiKey: '',
        openaiCompatibleApiKey: '',
        openaiCompatibleModels: [],
      });

      // Second call for getOllamaBaseUrl
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        ollamaBaseUrl: '',
      });

      // Third call for ollama custom models check
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        ollamaCustomModels: [],
      });

      const providers = await configManager.getConfiguredProviders();

      expect(providers).toEqual([]);
    });
  });

  describe('getOllamaBaseUrl', () => {
    it('should return stored Ollama base URL', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        ollamaBaseUrl: 'http://localhost:11434',
      });

      const baseUrl = await configManager.getOllamaBaseUrl();

      expect(baseUrl).toBe('http://localhost:11434');
    });

    it('should return empty string when not configured', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        ollamaBaseUrl: '',
      });

      const baseUrl = await configManager.getOllamaBaseUrl();

      expect(baseUrl).toBe('');
    });
  });

  describe('updateProviderAndModel', () => {
    it('should update provider and model configuration', async () => {
      // First call to get current config
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        provider: 'anthropic',
        anthropicModelId: 'claude-3-7-sonnet-20250219',
        openaiModelId: 'gpt-4o',
        geminiModelId: 'gemini-1.5-pro',
        ollamaModelId: 'llama3.1',
      });

      mockChromeStorage.sync.set.mockResolvedValue(undefined);

      await configManager.updateProviderAndModel('openai', 'gpt-4o');

      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ provider: 'openai' });
      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ openaiModelId: 'gpt-4o' });
    });

    it('should handle Anthropic provider update', async () => {
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        provider: 'anthropic',
        anthropicModelId: 'claude-3-7-sonnet-20250219',
        openaiModelId: 'gpt-4o',
        geminiModelId: 'gemini-1.5-pro',
        ollamaModelId: 'llama3.1',
      });

      mockChromeStorage.sync.set.mockResolvedValue(undefined);

      await configManager.updateProviderAndModel('anthropic', 'claude-3-5-sonnet-20241022');

      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ provider: 'anthropic' });
      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ anthropicModelId: 'claude-3-5-sonnet-20241022' });
    });

    it('should handle Gemini provider update', async () => {
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        provider: 'anthropic',
        anthropicModelId: 'claude-3-7-sonnet-20250219',
        openaiModelId: 'gpt-4o',
        geminiModelId: 'gemini-1.5-pro',
        ollamaModelId: 'llama3.1',
      });

      mockChromeStorage.sync.set.mockResolvedValue(undefined);

      await configManager.updateProviderAndModel('gemini', 'gemini-2.5-flash-preview-05-20');

      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ provider: 'gemini' });
      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ geminiModelId: 'gemini-2.5-flash-preview-05-20' });
    });

    it('should handle Ollama provider update', async () => {
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        provider: 'anthropic',
        anthropicModelId: 'claude-3-7-sonnet-20250219',
        openaiModelId: 'gpt-4o',
        geminiModelId: 'gemini-1.5-pro',
        ollamaModelId: 'llama3.1',
      });

      mockChromeStorage.sync.set.mockResolvedValue(undefined);

      await configManager.updateProviderAndModel('ollama', 'llama2');

      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ provider: 'ollama' });
      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ ollamaModelId: 'llama2' });
    });

    it('should not update model for unsupported provider', async () => {
      mockChromeStorage.sync.get.mockResolvedValueOnce({
        provider: 'anthropic',
        anthropicModelId: 'claude-3-7-sonnet-20250219',
        openaiModelId: 'gpt-4o',
        geminiModelId: 'gemini-1.5-pro',
        ollamaModelId: 'llama3.1',
      });

      mockChromeStorage.sync.set.mockResolvedValue(undefined);

      await configManager.updateProviderAndModel('unsupported', 'model');

      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ provider: 'unsupported' });
      expect(mockChromeStorage.sync.set).toHaveBeenCalledTimes(1); // Only provider update, no model update
    });
  });

  describe('getModelsForProvider', () => {
    it('should return models for Anthropic', async () => {
      const models = await configManager.getModelsForProvider('anthropic');

      expect(models).toEqual([
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      ]);
    });

    it('should return models for OpenAI', async () => {
      const models = await configManager.getModelsForProvider('openai');

      expect(models).toEqual([
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      ]);
    });

    it('should return models for Gemini', async () => {
      const models = await configManager.getModelsForProvider('gemini');

      expect(models).toEqual([
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
      ]);
    });

    it('should return models for Ollama', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        ollamaCustomModels: [{ id: 'llama2', name: 'Llama 2' }],
      });

      const models = await configManager.getModelsForProvider('ollama');

      expect(models).toEqual([
        { id: 'llama2', name: 'Llama 2' },
        { id: 'llama3.1', name: 'Llama 3.1' },
      ]);
    });

    it('should return models for OpenAI-compatible', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        openaiCompatibleModels: [{ id: 'custom-model', name: 'Custom Model' }],
      });

      const models = await configManager.getModelsForProvider('openai-compatible');

      expect(models).toEqual([
        { id: 'custom-model', name: 'Custom Model' },
      ]);
    });

    it('should return empty array for unsupported provider', async () => {
      const models = await configManager.getModelsForProvider('unsupported');

      expect(models).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle Chrome storage API unavailability', async () => {
      // Temporarily remove chrome.storage
      const originalChrome = global.chrome;
      delete (global as any).chrome;

      await expect(configManager.getProviderConfig()).rejects.toThrow();

      // Restore chrome object
      (global as any).chrome = originalChrome;
    });
  });
});
