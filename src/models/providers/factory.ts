import { LLMProvider, ProviderOptions } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';

export function createProvider(
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama',
  options: ProviderOptions
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
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
