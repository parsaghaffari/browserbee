import Anthropic from "@anthropic-ai/sdk";
import { Stream as AnthropicStream } from "@anthropic-ai/sdk/streaming";
import { anthropicModels, anthropicDefaultModelId } from '../models';
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream, StreamChunk } from './types';

export class AnthropicProvider implements LLMProvider {
  // Static method to get available models
  static getAvailableModels(): {id: string, name: string}[] {
    return Object.entries(anthropicModels).map(([id, info]) => ({
      id,
      name: info.name
    }));
  }
  private options: ProviderOptions;
  private client: Anthropic;

  constructor(options: ProviderOptions) {
    this.options = options;
    this.client = new Anthropic({
      apiKey: this.options.apiKey,
      baseURL: this.options.baseUrl,
      dangerouslyAllowBrowser: true,
    });
  }

  async *createMessage(systemPrompt: string, messages: any[], tools?: any[]): ApiStream {
    const model = this.getModel();
    const modelId = model.id;

    // Configure thinking budget if available
    const budget_tokens = this.options.thinkingBudgetTokens || 0;
    const reasoningOn = modelId.includes("3-7") && budget_tokens !== 0;

    // Find user message indices for cache control
    const userMsgIndices = messages.reduce(
      (acc, msg, index) => (msg.role === "user" ? [...acc, index] : acc),
      [] as number[]
    );
    const lastUserMsgIndex = userMsgIndices[userMsgIndices.length - 1] ?? -1;
    const secondLastMsgUserIndex = userMsgIndices[userMsgIndices.length - 2] ?? -1;

    // Create message stream with thinking config and cache control
    const stream = await this.client.messages.create(
      {
        model: modelId,
        thinking: reasoningOn ? { type: "enabled" as const, budget_tokens } : undefined,
        max_tokens: model.info.maxTokens || 8192,
        temperature: reasoningOn ? undefined : 0, // Temperature must be undefined when thinking is enabled
        system: [
          {
            text: systemPrompt,
            type: "text",
            cache_control: { type: "ephemeral" },
          },
        ],
        // Process messages to filter out system instructions and ensure clean conversation
        messages: messages
          // First filter out system instructions embedded in user messages
          .filter(message =>
            !(message.role === "user" &&
              typeof message.content === "string" &&
              message.content.startsWith("[SYSTEM INSTRUCTION:"))
          )
          // Then apply cache control to user messages
          .map((message, index) => {
            if (index === lastUserMsgIndex || index === secondLastMsgUserIndex) {
              return {
                ...message,
                content:
                  typeof message.content === "string"
                    ? [
                        {
                          type: "text",
                          text: message.content,
                          cache_control: {
                            type: "ephemeral",
                          },
                        },
                      ]
                    : message.content.map((content: any, contentIndex: number) =>
                        contentIndex === message.content.length - 1
                          ? {
                              ...content,
                              cache_control: {
                                type: "ephemeral",
                              },
                            }
                          : content
                      ),
              };
            }
            return message;
          }),
        stream: true,
      },
      modelId.includes("claude-3") ? {
        headers: {
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
      } : undefined
    );

    for await (const chunk of stream) {
      switch (chunk.type) {
        case "message_start":
          {
            // Token usage information
            const usage = chunk.message.usage;
            yield {
              type: "usage",
              inputTokens: usage.input_tokens || 0,
              outputTokens: usage.output_tokens || 0,
              cacheWriteTokens: usage.cache_creation_input_tokens || undefined,
              cacheReadTokens: usage.cache_read_input_tokens || undefined,
            };
          }
          break;
        case "message_delta":
          // Output token updates
          yield {
            type: "usage",
            inputTokens: 0,
            outputTokens: chunk.usage.output_tokens || 0,
          };
          break;
        case "message_stop":
          // No usage data, just an indicator that the message is done
          break;
        case "content_block_start":
          switch (chunk.content_block.type) {
            case "thinking":
              yield {
                type: "reasoning",
                reasoning: chunk.content_block.thinking || "",
              };
              break;
            case "redacted_thinking":
              // Handle redacted thinking blocks
              yield {
                type: "reasoning",
                reasoning: "[Redacted thinking block]",
              };
              break;
            case "text":
              // Insert line break between multiple text blocks
              if (chunk.index > 0) {
                yield {
                  type: "text",
                  text: "\n",
                };
              }
              yield {
                type: "text",
                text: chunk.content_block.text,
              };
              break;
          }
          break;
        case "content_block_delta":
          switch (chunk.delta.type) {
            case "thinking_delta":
              yield {
                type: "reasoning",
                reasoning: chunk.delta.thinking,
              };
              break;
            case "text_delta":
              yield {
                type: "text",
                text: chunk.delta.text,
              };
              break;
            case "signature_delta":
              // We don't need to do anything with the signature
              break;
          }
          break;
        case "content_block_stop":
          break;
      }
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    const modelId = this.options.apiModelId || anthropicDefaultModelId;

    // Check if the model ID exists in our models, otherwise use the default
    const safeModelId = Object.keys(anthropicModels).includes(modelId)
      ? modelId as keyof typeof anthropicModels
      : anthropicDefaultModelId;

    return {
      id: modelId,
      info: anthropicModels[safeModelId],
    };
  }
}
