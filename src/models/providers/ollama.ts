import { Anthropic } from "@anthropic-ai/sdk";
import { Message, Ollama } from "ollama/browser";
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream, StreamChunk } from './types';
import { convertToOllamaMessages } from "./ollama-format";
import { ollamaModels, ollamaDefaultModelId } from '../models';

export class OllamaProvider implements LLMProvider {
  // Static method to get available models
  static getAvailableModels(): {id: string, name: string}[] {
    return Object.entries(ollamaModels).map(([id, info]) => ({
      id,
      name: info.name
    }));
  }
  
  private options: ProviderOptions;
  private client: Ollama;

  constructor(options: ProviderOptions) {
    this.options = options;
    this.client = new Ollama({ 
      host: this.options.baseUrl || "http://localhost:11434" 
    });
  }

  async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[], tools?: any[]): ApiStream {
    const ollamaMessages: Message[] = [
      { role: "system", content: systemPrompt }, 
      ...convertToOllamaMessages(messages)
    ];

    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Ollama request timed out after 120 seconds")), 120000);
      });

      // Create the actual API request promise
      const apiPromise = this.client.chat({
        model: this.getModel().id,
        messages: ollamaMessages,
        stream: true,
        options: {
          num_ctx: 32768, // Default context window size
        },
      });

      // Race the API request against the timeout
      const stream = (await Promise.race([apiPromise, timeoutPromise])) as Awaited<typeof apiPromise>;

      try {
        for await (const chunk of stream) {
          if (typeof chunk.message.content === "string") {
            yield {
              type: "text",
              text: chunk.message.content,
            };
          }

          // Handle token usage if available
          if (chunk.eval_count !== undefined || chunk.prompt_eval_count !== undefined) {
            yield {
              type: "usage",
              inputTokens: chunk.prompt_eval_count || 0,
              outputTokens: chunk.eval_count || 0,
            };
          }
        }
      } catch (streamError: any) {
        console.error("Error processing Ollama stream:", streamError);
        throw new Error(`Ollama stream processing error: ${streamError.message || "Unknown error"}`);
      }
    } catch (error: any) {
      // Check if it's a timeout error
      if (error.message && error.message.includes("timed out")) {
        throw new Error("Ollama request timed out after 120 seconds");
      }

      // Enhance error reporting
      const statusCode = error.status || error.statusCode;
      const errorMessage = error.message || "Unknown error";

      console.error(`Ollama API error (${statusCode || "unknown"}): ${errorMessage}`);
      throw error;
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    const modelId = this.options.apiModelId || ollamaDefaultModelId;
    
    // Check if the model ID exists in our models, otherwise use the default
    const safeModelId = Object.keys(ollamaModels).includes(modelId) 
      ? modelId as keyof typeof ollamaModels 
      : ollamaDefaultModelId;
    
    return {
      id: modelId,
      info: ollamaModels[safeModelId],
    };
  }
}
