import { ModelInfo } from './providers/types';

// Ollama Models
export type OllamaModelId = string;
export const ollamaDefaultModelId: OllamaModelId = "";
// Generic model info for Ollama (used only for pricing display)
export const ollamaModels = {
  "ollama": {
    name: "Ollama",
    inputPrice: 0.0,
    outputPrice: 0.0,
    maxTokens: 4096,
    contextWindow: 32768,
    supportsImages: false,
    supportsPromptCache: false,
  }
};

// Anthropic Models
export type AnthropicModelId = keyof typeof anthropicModels;
export const anthropicDefaultModelId: AnthropicModelId = "claude-3-7-sonnet-20250219";
export const anthropicModels = {
  "claude-3-7-sonnet-20250219": {
    name: "Claude 3.7 Sonnet",
    inputPrice: 3.0,
    outputPrice: 15.0,
    maxTokens: 8192,
    contextWindow: 200000,
    supportsImages: true,
    supportsPromptCache: true,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  "claude-3-haiku-20240307": {
    name: "Claude 3.5 Haiku",
    inputPrice: 0.8,
    outputPrice: 4.0,
    maxTokens: 4096,
    contextWindow: 200000,
    supportsImages: true,
    supportsPromptCache: true,
    cacheWritesPrice: 0.3,
    cacheReadsPrice: 0.03,
  },
};

// OpenAI Models
export type OpenAIModelId = keyof typeof openaiModels;
export const openaiDefaultModelId: OpenAIModelId = "gpt-4o";
export const openaiModels = {
  "gpt-4o": {
    name: "GPT-4o",
    inputPrice: 2.5,
    outputPrice: 10.0,
    maxTokens: 4096,
    contextWindow: 128000,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 1.25,
  },
  "o3": {
    name: "o3",
    inputPrice: 10.0,
    outputPrice: 40.0,
    maxTokens: 100000,
    contextWindow: 200000,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 2.5,
  },
  "o4-mini": {
    name: "o4-mini",
    inputPrice: 1.1,
    outputPrice: 4.4,
    maxTokens: 100000,
    contextWindow: 200000,
    supportsImages: true,
    supportsPromptCache: true,
    cacheReadsPrice: 0.275,
  },
};

// Gemini Models
export type GeminiModelId = keyof typeof geminiModels;
export const geminiDefaultModelId: GeminiModelId = "gemini-2.5-flash-preview-04-17";
export const geminiModels = {
  "gemini-2.5-flash-preview-04-17": {
    name: "Gemini 2.5 Flash",
    inputPrice: 0.15,
    outputPrice: 0.6,
    maxTokens: 65536,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: false,
    thinkingConfig: {
      maxBudget: 24576,
      outputPrice: 3.5,
    },
  },
  "gemini-2.5-pro-preview-03-25": {
    name: "Gemini 2.5 Pro",
    inputPrice: 1.25,
    outputPrice: 10.0,
    maxTokens: 65536,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: false,
  },
  "gemini-2.0-flash-001": {
    name: "Gemini 2.0 Flash",
    inputPrice: 0.1,
    outputPrice: 0.4,
    maxTokens: 8192,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: false,
  },
  "gemini-2.0-flash-lite-preview-02-05": {
    name: "Gemini 2.0 Flash Lite",
    inputPrice: 0.075,
    outputPrice: 0.30,
    maxTokens: 8192,
    contextWindow: 1048576,
    supportsImages: true,
    supportsPromptCache: false,
  },
};
