import { ProviderConfig } from '../../src/background/configManager';

export const mockAnthropicConfig: ProviderConfig = {
  provider: 'anthropic',
  apiKey: 'test-anthropic-key',
  apiModelId: 'claude-3-5-sonnet-20241022',
  baseUrl: undefined,
  thinkingBudgetTokens: undefined,
};

export const mockOpenAIConfig: ProviderConfig = {
  provider: 'openai',
  apiKey: 'test-openai-key',
  apiModelId: 'gpt-4o',
  baseUrl: undefined,
  thinkingBudgetTokens: undefined,
};

export const mockGeminiConfig: ProviderConfig = {
  provider: 'gemini',
  apiKey: 'test-gemini-key',
  apiModelId: 'gemini-2.5-flash-preview-05-20',
  baseUrl: undefined,
  thinkingBudgetTokens: 1000,
};

export const mockOllamaConfig: ProviderConfig = {
  provider: 'ollama',
  apiKey: 'dummy-key',
  apiModelId: 'llama2',
  baseUrl: 'http://localhost:11434',
  thinkingBudgetTokens: undefined,
};

export const mockOpenAICompatibleConfig: ProviderConfig = {
  provider: 'openai-compatible',
  apiKey: 'test-compatible-key',
  apiModelId: 'custom-model',
  baseUrl: 'https://api.custom-provider.com/v1',
  thinkingBudgetTokens: undefined,
};

export const invalidConfig: Partial<ProviderConfig> = {
  provider: 'anthropic',
  apiKey: '', // Invalid: empty API key
  apiModelId: 'claude-3-5-sonnet-20241022',
};

export const allConfigs = [
  mockAnthropicConfig,
  mockOpenAIConfig,
  mockGeminiConfig,
  mockOllamaConfig,
  mockOpenAICompatibleConfig,
];
