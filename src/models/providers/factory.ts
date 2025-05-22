import { LLMProvider, ProviderOptions } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { OllamaProvider, OllamaProviderOptions } from './ollama';
import { OpenAICompatibleProvider, OpenAICompatibleProviderOptions } from './openai-compatible';

export async function createProvider(
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'openai-compatible',
  options: ProviderOptions | OpenAICompatibleProviderOptions
): Promise<LLMProvider> {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(options);
    case 'openai':
      return new OpenAIProvider(options);
    case 'gemini':
      return new GeminiProvider(options);
      case 'ollama':
        // Get custom Ollama models from storage
        const ollamaCustomModels = await chrome.storage.sync.get({ ollamaCustomModels: [] });
        return new OllamaProvider({
          ...options,
          ollamaCustomModels: ollamaCustomModels.ollamaCustomModels || []
        } as OllamaProviderOptions);
    case 'openai-compatible':
      return new OpenAICompatibleProvider(options as OpenAICompatibleProviderOptions);
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
