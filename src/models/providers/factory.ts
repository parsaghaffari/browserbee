import { LLMProvider, ProviderOptions } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';

export function createProvider(
  provider: 'anthropic' | 'openai' | 'gemini',
  options: ProviderOptions
): LLMProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(options);
    case 'openai':
      return new OpenAIProvider(options);
    case 'gemini':
      return new GeminiProvider(options);
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
