import { LLMProvider, ProviderOptions } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';
import { OpenAICompatibleProvider, OpenAICompatibleProviderOptions } from './openai-compatible';

export function createProvider(
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'openai-compatible',
  options: ProviderOptions | OpenAICompatibleProviderOptions
): LLMProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(options);
    case 'openai':
      return new OpenAIProvider(options);
    case 'gemini':
      return new GeminiProvider(options);
    case 'ollama':
      return new OllamaProvider(options);
    case 'openai-compatible':
      return new OpenAICompatibleProvider(options as OpenAICompatibleProviderOptions);
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
