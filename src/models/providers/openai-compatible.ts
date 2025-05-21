import OpenAI from "openai";
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream, StreamChunk } from './types';

export interface OpenAICompatibleModelInfo extends ModelInfo {
  isReasoning?: boolean;
}

export interface OpenAICompatibleProviderOptions extends ProviderOptions {
  openaiCompatibleModels: Array<{ id: string; name: string; isReasoning?: boolean; }>;
}

export class OpenAICompatibleProvider implements LLMProvider {
  static getAvailableModels(options: OpenAICompatibleProviderOptions): { id: string; name: string }[] {
    return (options.openaiCompatibleModels || []).map(m => ({ id: m.id, name: m.name }));
  }

  private options: OpenAICompatibleProviderOptions;
  private client: OpenAI;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.options = options;
    this.client = new OpenAI({
      apiKey: this.options.apiKey,
      baseURL: this.options.baseUrl,
    });
  }

  async *createMessage(systemPrompt: string, messages: any[], tools?: any[]): ApiStream {
    const model = this.getModel();
    const modelId = model.id;
    const modelInfo = model.info;
    const isReasoningModel = modelInfo.isReasoning;

    // Filter out system instructions
    const filteredMessages = messages.filter(message =>
      !(message.role === "user" && typeof message.content === "string" && message.content.startsWith("[SYSTEM INSTRUCTION:"))
    );

    // Convert to OpenAI message format
    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...filteredMessages.map(msg => ({ role: msg.role, content: msg.content })),
    ];

    // Configure API request options
    const options: any = {
      model: modelId,
      messages: openaiMessages,
      stream: true,
      stream_options: { include_usage: true },
    };

    // Reasoning model parameters
    if (isReasoningModel) {
      options.max_completion_tokens = modelInfo.maxTokens || 4096;
      options.temperature = 0;
    } else {
      options.max_tokens = modelInfo.maxTokens || 4096;
      options.temperature = 0;
    }

    // Support tools
    if (tools && tools.length > 0) {
      const openAITools = tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: {
              input: { type: "string", description: "The input to the tool" },
              requires_approval: { type: "boolean", description: "Whether this tool call requires user approval" }
            },
            required: ["input"]
          }
        }
      }));
      options.tools = openAITools;
      options.tool_choice = "auto";
    }

    try {
      const stream = await this.client.chat.completions.create(options) as unknown as AsyncIterable<any>;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield { type: "text", text: delta.content };
        }
        if (chunk.usage) {
          yield {
            type: "usage",
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
          };
        }
      }
    } catch (error) {
      yield { type: "text", text: "Error: Failed to stream response from OpenAI-Compatible API. Please try again." };
    }
  }

  getModel(): { id: string; info: OpenAICompatibleModelInfo } {
    const modelId = this.options.apiModelId;
    const model = (this.options.openaiCompatibleModels || []).find(m => m.id === modelId);
    return {
      id: modelId || (this.options.openaiCompatibleModels[0]?.id || ''),
      info: {
        name: model?.name || modelId || '',
        inputPrice: 0,
        outputPrice: 0,
        maxTokens: 4096,
        isReasoning: model?.isReasoning,
      }
    };
  }
} 