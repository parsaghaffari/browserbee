import { AnthropicProvider } from '../models/providers/anthropic';
import { OpenAIProvider } from '../models/providers/openai';
import { GeminiProvider } from '../models/providers/gemini';
import { OllamaProvider } from '../models/providers/ollama';
import { OpenAICompatibleProvider } from '../models/providers/openai-compatible';

export interface ProviderConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'openai-compatible';
  apiKey: string;
  apiModelId?: string;
  baseUrl?: string;
  thinkingBudgetTokens?: number;
  // openai-compatible only
  openaiCompatibleModels?: Array<{ id: string; name: string; isReasoningModel?: boolean }>;
}

export class ConfigManager {
  private static instance: ConfigManager;
  
  private constructor() {}
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  async getProviderConfig(): Promise<ProviderConfig> {
    const result = await chrome.storage.sync.get({
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
      ollamaModelId: 'llama3.1',
      ollamaBaseUrl: '',
      thinkingBudgetTokens: 0,
      // openai-compatible
      openaiCompatibleApiKey: '',
      openaiCompatibleModelId: '',
      openaiCompatibleBaseUrl: '',
      openaiCompatibleModels: [],
    });
    
    // Return provider-specific configuration
    switch (result.provider) {
      case 'anthropic':
        return {
          provider: 'anthropic',
          apiKey: result.anthropicApiKey,
          apiModelId: result.anthropicModelId,
          baseUrl: result.anthropicBaseUrl,
          thinkingBudgetTokens: result.thinkingBudgetTokens,
        };
      case 'openai':
        return {
          provider: 'openai',
          apiKey: result.openaiApiKey,
          apiModelId: result.openaiModelId,
          baseUrl: result.openaiBaseUrl,
        };
      case 'gemini':
        return {
          provider: 'gemini',
          apiKey: result.geminiApiKey,
          apiModelId: result.geminiModelId,
          baseUrl: result.geminiBaseUrl,
        };
      case 'ollama':
        return {
          provider: 'ollama',
          apiKey: result.ollamaApiKey,
          apiModelId: result.ollamaModelId,
          baseUrl: result.ollamaBaseUrl,
        };
      case 'openai-compatible':
        return {
          provider: 'openai-compatible',
          apiKey: result.openaiCompatibleApiKey,
          apiModelId: result.openaiCompatibleModelId,
          baseUrl: result.openaiCompatibleBaseUrl,
          openaiCompatibleModels: result.openaiCompatibleModels || [],
        };
      default:
        throw new Error(`Provider ${result.provider} not supported`);
    }
  }
  
  async saveProviderConfig(config: Partial<ProviderConfig>): Promise<void> {
    // Save provider-specific configuration
    await chrome.storage.sync.set(config);
  }
  
  /**
   * Get all providers that have API keys configured
   */
  async getConfiguredProviders(): Promise<string[]> {
    const result = await chrome.storage.sync.get({
      anthropicApiKey: '',
      openaiApiKey: '',
      geminiApiKey: '',
      ollamaApiKey: '',
      openaiCompatibleApiKey: '',
      openaiCompatibleModels: [],
    });
    
    const providers = [];
    if (result.anthropicApiKey) providers.push('anthropic');
    if (result.openaiApiKey) providers.push('openai');
    if (result.geminiApiKey) providers.push('gemini');
    
    // For Ollama, check if the base URL is configured
    const ollamaBaseUrl = await this.getOllamaBaseUrl();
    if (ollamaBaseUrl) providers.push('ollama');
    
    if (result.openaiCompatibleApiKey && (result.openaiCompatibleModels?.length > 0)) providers.push('openai-compatible');
    
    return providers;
  }
  
  /**
   * Get available models for a specific provider
   */
  async getModelsForProvider(provider: string): Promise<{id: string, name: string}[]> {
    switch (provider) {
      case 'anthropic':
        return AnthropicProvider.getAvailableModels();
      case 'openai':
        return OpenAIProvider.getAvailableModels();
      case 'gemini':
        return GeminiProvider.getAvailableModels();
      case 'ollama':
        return OllamaProvider.getAvailableModels();
      case 'openai-compatible': {
        const result = await chrome.storage.sync.get({ openaiCompatibleModels: [] });
        return OpenAICompatibleProvider.getAvailableModels({ openaiCompatibleModels: result.openaiCompatibleModels || [] } as any);
      }
      default:
        return [];
    }
  }
  
  /**
   * Get the Ollama base URL from storage
   */
  async getOllamaBaseUrl(): Promise<string> {
    const result = await chrome.storage.sync.get({
      ollamaBaseUrl: '',
    });
    return result.ollamaBaseUrl;
  }
  
  async updateProviderAndModel(provider: string, modelId: string): Promise<void> {
    // Get current config
    const result = await chrome.storage.sync.get({
      provider: 'anthropic',
      anthropicModelId: 'claude-3-7-sonnet-20250219',
      openaiModelId: 'gpt-4o',
      geminiModelId: 'gemini-1.5-pro',
      ollamaModelId: 'llama3.1',
    });
    
    // Update provider
    await chrome.storage.sync.set({ provider });
    
    // Update model ID for the specific provider
    switch (provider) {
      case 'anthropic':
        await chrome.storage.sync.set({ anthropicModelId: modelId });
        break;
      case 'openai':
        await chrome.storage.sync.set({ openaiModelId: modelId });
        break;
      case 'gemini':
        await chrome.storage.sync.set({ geminiModelId: modelId });
        break;
      case 'ollama':
        await chrome.storage.sync.set({ ollamaModelId: modelId });
        break;
    }
  }
}
