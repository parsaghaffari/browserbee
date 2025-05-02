export interface ModelInfo {
  name: string;
  inputPrice: number;  // Price per million tokens
  outputPrice: number; // Price per million tokens
  maxTokens?: number;  // Maximum number of tokens the model can generate in a response
  contextWindow?: number; // Total number of tokens (input + output) the model can process
  supportsImages?: boolean; // Whether the model supports image inputs
  supportsPromptCache?: boolean; // Whether the model supports prompt caching
  cacheWritesPrice?: number; // Price per million tokens for cache writes
  cacheReadsPrice?: number; // Price per million tokens for cache reads
  thinkingConfig?: {
    maxBudget?: number; // Max allowed thinking budget tokens
    outputPrice?: number; // Output price per million tokens when budget > 0
  };
}

export interface ProviderOptions {
  apiKey: string;
  apiModelId?: string;
  baseUrl?: string;
  thinkingBudgetTokens?: number;
  dangerouslyAllowBrowser?: boolean;
}

export interface StreamChunk {
  type: "text" | "reasoning" | "usage";
  text?: string;
  reasoning?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

export type ApiStream = AsyncGenerator<StreamChunk, void, unknown>;

export interface LLMProvider {
  createMessage(systemPrompt: string, messages: any[], tools?: any[]): ApiStream;
  getModel(): { id: string; info: ModelInfo };
}
