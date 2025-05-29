import { LLMProvider, ModelInfo, StreamChunk, ApiStream } from '../../src/models/providers/types';

export interface MockLLMProvider extends LLMProvider {
  createMessage: jest.MockedFunction<any>;
  getModel: jest.MockedFunction<any>;
}

export function createMockProvider(): MockLLMProvider {
  const mockStream: ApiStream = (async function* () {
    yield { type: 'text', text: 'Mock', inputTokens: 5, outputTokens: 0 } as StreamChunk;
    yield { type: 'text', text: ' streaming', inputTokens: 0, outputTokens: 5 } as StreamChunk;
    yield { type: 'text', text: ' response', inputTokens: 0, outputTokens: 10 } as StreamChunk;
    yield { type: 'usage', inputTokens: 10, outputTokens: 15 } as StreamChunk;
  })();

  return {
    createMessage: jest.fn().mockReturnValue(mockStream),
    getModel: jest.fn().mockReturnValue({
      id: 'mock-model',
      info: {
        name: 'Mock Model',
        inputPrice: 1.0,
        outputPrice: 2.0,
        maxTokens: 4096,
        contextWindow: 8192,
        supportsImages: true,
        supportsPromptCache: false,
      } as ModelInfo,
    }),
  };
}

// Mock Anthropic SDK
export const mockAnthropic = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Mock Anthropic response' }],
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
    stream: jest.fn().mockImplementation(async function* () {
      yield { type: 'content_block_delta', delta: { text: 'Mock' } };
      yield { type: 'content_block_delta', delta: { text: ' streaming' } };
      yield { type: 'message_delta', usage: { output_tokens: 15 } };
    }),
  },
};

// Mock OpenAI SDK
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Mock OpenAI response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    },
  },
};

// Mock Gemini SDK
export const mockGemini = {
  generateContent: jest.fn().mockResolvedValue({
    response: {
      text: jest.fn().mockReturnValue('Mock Gemini response'),
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
    },
  }),
  generateContentStream: jest.fn().mockImplementation(async function* () {
    yield { text: jest.fn().mockReturnValue('Mock') };
    yield { text: jest.fn().mockReturnValue(' streaming') };
    yield { text: jest.fn().mockReturnValue(' response') };
  }),
};

// Mock Ollama SDK
export const mockOllama = {
  chat: jest.fn().mockResolvedValue({
    message: { content: 'Mock Ollama response' },
    eval_count: 20,
    prompt_eval_count: 10,
  }),
  generate: jest.fn().mockResolvedValue({
    response: 'Mock Ollama response',
    eval_count: 20,
    prompt_eval_count: 10,
  }),
};

// Mock factory function
export const mockCreateProvider = jest.fn().mockImplementation((type: string) => {
  return createMockProvider();
});
