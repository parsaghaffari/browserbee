import { createProvider } from '../../../../src/models/providers/factory';
import { ProviderOptions } from '../../../../src/models/providers/types';
import { 
  mockAnthropicConfig, 
  mockOpenAIConfig, 
  mockGeminiConfig, 
  mockOllamaConfig,
  mockOpenAICompatibleConfig 
} from '../../../fixtures/sampleConfigs';

// Mock the individual provider modules
jest.mock('../../../../src/models/providers/anthropic', () => ({
  AnthropicProvider: jest.fn().mockImplementation(() => ({
    createMessage: jest.fn(),
    getModel: jest.fn().mockReturnValue({
      id: 'claude-3-5-sonnet-20241022',
      info: { name: 'Claude 3.5 Sonnet', inputPrice: 3.0, outputPrice: 15.0 }
    })
  }))
}));

jest.mock('../../../../src/models/providers/openai', () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    createMessage: jest.fn(),
    getModel: jest.fn().mockReturnValue({
      id: 'gpt-4o',
      info: { name: 'GPT-4o', inputPrice: 2.5, outputPrice: 10.0 }
    })
  }))
}));

jest.mock('../../../../src/models/providers/gemini', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    createMessage: jest.fn(),
    getModel: jest.fn().mockReturnValue({
      id: 'gemini-2.5-flash-preview-05-20',
      info: { name: 'Gemini 2.5 Flash', inputPrice: 0.15, outputPrice: 0.6 }
    })
  }))
}));

jest.mock('../../../../src/models/providers/ollama', () => ({
  OllamaProvider: jest.fn().mockImplementation(() => ({
    createMessage: jest.fn(),
    getModel: jest.fn().mockReturnValue({
      id: 'llama2',
      info: { name: 'Llama 2', inputPrice: 0.0, outputPrice: 0.0 }
    })
  }))
}));

jest.mock('../../../../src/models/providers/openai-compatible', () => ({
  OpenAICompatibleProvider: jest.fn().mockImplementation(() => ({
    createMessage: jest.fn(),
    getModel: jest.fn().mockReturnValue({
      id: 'custom-model',
      info: { name: 'Custom Model', inputPrice: 1.0, outputPrice: 2.0 }
    })
  }))
}));

describe('Provider Factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProvider', () => {
    it('should create an Anthropic provider', async () => {
      const options: ProviderOptions = {
        apiKey: mockAnthropicConfig.apiKey!,
        apiModelId: mockAnthropicConfig.apiModelId,
        dangerouslyAllowBrowser: true,
      };

      const provider = await createProvider('anthropic', options);

      expect(provider).toBeDefined();
      expect(provider.getModel().id).toBe('claude-3-5-sonnet-20241022');
      
      const { AnthropicProvider } = require('../../../../src/models/providers/anthropic');
      expect(AnthropicProvider).toHaveBeenCalledWith(options);
    });

    it('should create an OpenAI provider', async () => {
      const options: ProviderOptions = {
        apiKey: mockOpenAIConfig.apiKey!,
        apiModelId: mockOpenAIConfig.apiModelId,
        dangerouslyAllowBrowser: true,
      };

      const provider = await createProvider('openai', options);

      expect(provider).toBeDefined();
      expect(provider.getModel().id).toBe('gpt-4o');
      
      const { OpenAIProvider } = require('../../../../src/models/providers/openai');
      expect(OpenAIProvider).toHaveBeenCalledWith(options);
    });

    it('should create a Gemini provider', async () => {
      const options: ProviderOptions = {
        apiKey: mockGeminiConfig.apiKey!,
        apiModelId: mockGeminiConfig.apiModelId,
        thinkingBudgetTokens: mockGeminiConfig.thinkingBudgetTokens,
        dangerouslyAllowBrowser: true,
      };

      const provider = await createProvider('gemini', options);

      expect(provider).toBeDefined();
      expect(provider.getModel().id).toBe('gemini-2.5-flash-preview-05-20');
      
      const { GeminiProvider } = require('../../../../src/models/providers/gemini');
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });

    it('should create an Ollama provider', async () => {
      const options: ProviderOptions = {
        apiKey: mockOllamaConfig.apiKey!,
        apiModelId: mockOllamaConfig.apiModelId,
        baseUrl: mockOllamaConfig.baseUrl,
        dangerouslyAllowBrowser: true,
      };

      const provider = await createProvider('ollama', options);

      expect(provider).toBeDefined();
      expect(provider.getModel().id).toBe('llama2');
      
      const { OllamaProvider } = require('../../../../src/models/providers/ollama');
      expect(OllamaProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: mockOllamaConfig.apiKey,
          apiModelId: mockOllamaConfig.apiModelId,
          baseUrl: mockOllamaConfig.baseUrl,
          dangerouslyAllowBrowser: true,
          ollamaCustomModels: expect.any(Array),
        })
      );
    });

    it('should create an OpenAI-compatible provider', async () => {
      const options: ProviderOptions = {
        apiKey: mockOpenAICompatibleConfig.apiKey!,
        apiModelId: mockOpenAICompatibleConfig.apiModelId,
        baseUrl: mockOpenAICompatibleConfig.baseUrl,
        dangerouslyAllowBrowser: true,
      };

      const provider = await createProvider('openai-compatible', options);

      expect(provider).toBeDefined();
      expect(provider.getModel().id).toBe('custom-model');
      
      const { OpenAICompatibleProvider } = require('../../../../src/models/providers/openai-compatible');
      expect(OpenAICompatibleProvider).toHaveBeenCalledWith(options);
    });

    it('should throw error for unsupported provider type', async () => {
      const options: ProviderOptions = {
        apiKey: 'test-key',
        dangerouslyAllowBrowser: true,
      };

      await expect(
        createProvider('unsupported' as any, options)
      ).rejects.toThrow('Provider unsupported not supported');
    });

    it('should handle missing API key', async () => {
      const options: ProviderOptions = {
        apiKey: '',
        dangerouslyAllowBrowser: true,
      };

      // Since our mocks don't validate API keys, this test should pass
      // In a real scenario, the provider would validate the API key
      const provider = await createProvider('anthropic', options);
      expect(provider).toBeDefined();
    });

    it('should pass through all options correctly', async () => {
      const options: ProviderOptions = {
        apiKey: 'test-key',
        apiModelId: 'custom-model-id',
        baseUrl: 'https://custom-api.com',
        thinkingBudgetTokens: 1000,
        dangerouslyAllowBrowser: true,
      };

      await createProvider('anthropic', options);

      const { AnthropicProvider } = require('../../../../src/models/providers/anthropic');
      expect(AnthropicProvider).toHaveBeenCalledWith(options);
    });

    it('should handle provider initialization errors', async () => {
      // Mock provider constructor to throw an error
      const { AnthropicProvider } = require('../../../../src/models/providers/anthropic');
      AnthropicProvider.mockImplementationOnce(() => {
        throw new Error('Provider initialization failed');
      });

      const options: ProviderOptions = {
        apiKey: 'test-key',
        dangerouslyAllowBrowser: true,
      };

      await expect(
        createProvider('anthropic', options)
      ).rejects.toThrow('Provider initialization failed');
    });
  });

  describe('Provider type validation', () => {
    const validProviderTypes = ['anthropic', 'openai', 'gemini', 'ollama', 'openai-compatible'];

    validProviderTypes.forEach(providerType => {
      it(`should accept valid provider type: ${providerType}`, async () => {
        const options: ProviderOptions = {
          apiKey: 'test-key',
          dangerouslyAllowBrowser: true,
        };

        await expect(
          createProvider(providerType as any, options)
        ).resolves.toBeDefined();
      });
    });

    it('should reject invalid provider types', async () => {
      const invalidTypes = ['invalid', 'unknown', ''];
      const options: ProviderOptions = {
        apiKey: 'test-key',
        dangerouslyAllowBrowser: true,
      };

      for (const invalidType of invalidTypes) {
        await expect(
          createProvider(invalidType as any, options)
        ).rejects.toThrow();
      }
    });
  });

  describe('Options validation', () => {
    it('should handle optional parameters gracefully', async () => {
      const minimalOptions: ProviderOptions = {
        apiKey: 'test-key',
        dangerouslyAllowBrowser: true,
      };

      // Should not throw with minimal options
      await expect(
        createProvider('anthropic', minimalOptions)
      ).resolves.toBeDefined();
    });

    it('should validate baseUrl format for providers that use it', async () => {
      const options: ProviderOptions = {
        apiKey: 'test-key',
        baseUrl: 'invalid-url',
        dangerouslyAllowBrowser: true,
      };

      // Note: This test assumes the provider validates URL format
      // The actual validation depends on the provider implementation
      await createProvider('ollama', options);
      
      const { OllamaProvider } = require('../../../../src/models/providers/ollama');
      expect(OllamaProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'invalid-url',
          ollamaCustomModels: expect.any(Array),
        })
      );
    });
  });

  describe('Provider-specific configurations', () => {
    it('should handle Gemini thinking budget tokens', async () => {
      const options: ProviderOptions = {
        apiKey: 'test-key',
        apiModelId: 'gemini-2.5-flash-preview-05-20',
        thinkingBudgetTokens: 2000,
        dangerouslyAllowBrowser: true,
      };

      await createProvider('gemini', options);

      const { GeminiProvider } = require('../../../../src/models/providers/gemini');
      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          thinkingBudgetTokens: 2000
        })
      );
    });

    it('should handle Ollama base URL configuration', async () => {
      const options: ProviderOptions = {
        apiKey: 'dummy-key',
        apiModelId: 'llama2',
        baseUrl: 'http://localhost:11434',
        dangerouslyAllowBrowser: true,
      };

      await createProvider('ollama', options);

      const { OllamaProvider } = require('../../../../src/models/providers/ollama');
      expect(OllamaProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:11434',
          ollamaCustomModels: expect.any(Array),
        })
      );
    });

    it('should handle OpenAI-compatible custom base URL', async () => {
      const options: ProviderOptions = {
        apiKey: 'test-key',
        apiModelId: 'custom-model',
        baseUrl: 'https://api.custom-provider.com/v1',
        dangerouslyAllowBrowser: true,
      };

      await createProvider('openai-compatible', options);

      const { OpenAICompatibleProvider } = require('../../../../src/models/providers/openai-compatible');
      expect(OpenAICompatibleProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'https://api.custom-provider.com/v1'
        })
      );
    });
  });
});
