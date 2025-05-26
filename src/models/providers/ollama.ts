import { Anthropic } from "@anthropic-ai/sdk";
import { Message, Ollama } from "ollama/browser";
import { OllamaModel } from '../../options/components/OllamaModelList';
import { ollamaModels } from '../models';
import { convertToOllamaMessages } from "./ollama-format";
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream } from './types';

export interface OllamaProviderOptions extends ProviderOptions {
  ollamaCustomModels?: OllamaModel[];
}

export class OllamaProvider implements LLMProvider {
  // Static method to get available models
  static getAvailableModels(options?: OllamaProviderOptions): {id: string, name: string}[] {
    // Only return custom models if provided
    const customModels = options?.ollamaCustomModels?.map(model => ({
      id: model.id,
      name: model.name
    })) || [];

    // Return only custom models, no generic entry
    return customModels;
  }

  private options: OllamaProviderOptions;
  private client: Ollama;

	constructor(options: OllamaProviderOptions) {
		this.options = options;

		// Only create the client if a base URL is provided
		if (this.options.baseUrl) {
			this.client = new Ollama({
				host: this.options.baseUrl
			});
		} else {
			// Use a default URL for the client, but it won't be used unless a base URL is configured
			this.client = new Ollama({
				host: "http://localhost:11434"
			});
		}
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[], _tools?: any[]): ApiStream {
		// Check if a base URL is configured
		if (!this.options.baseUrl) {
			throw new Error("Ollama base URL not configured. Please set the Ollama server URL in the extension options.");
		}

		// Check if any models are configured
		if (!this.options.ollamaCustomModels || this.options.ollamaCustomModels.length === 0) {
			throw new Error("No Ollama models configured. Please add at least one model in the extension options.");
		}

		const ollamaMessages: Message[] = [
			{ role: "system", content: systemPrompt },
			...convertToOllamaMessages(messages)
		];

		try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Ollama request timed out after 120 seconds")), 120000);
      });

      // Get the model info
      const model = this.getModel();

      // Create the actual API request promise
      const apiPromise = this.client.chat({
        model: model.id,
        messages: ollamaMessages,
        stream: true,
        options: {
          num_ctx: this.getContextWindowSize(model.id), // Use the context window size from the model configuration
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

  /**
   * Get the context window size for a model
   * @param modelId The model ID
   * @returns The context window size
   */
  private getContextWindowSize(modelId: string): number {
    // Check if it's a custom model
    const customModel = this.options.ollamaCustomModels?.find(m => m.id === modelId);
    if (customModel) {
      return customModel.contextWindow;
    }

    // Default context window size
    return 32768;
  }

  getModel(): { id: string; info: ModelInfo } {
    const modelId = this.options.apiModelId;

    // If no model ID is specified and we have custom models, use the first one
    if (!modelId && this.options.ollamaCustomModels && this.options.ollamaCustomModels.length > 0) {
      const firstModel = this.options.ollamaCustomModels[0];
      return {
        id: firstModel.id,
        info: {
          name: firstModel.name,
          inputPrice: 0.0,
          outputPrice: 0.0,
          maxTokens: 4096,
          contextWindow: firstModel.contextWindow,
          supportsImages: false,
          supportsPromptCache: false,
        }
      };
    }

    // Check if it's a custom model
    const customModel = this.options.ollamaCustomModels?.find(m => m.id === modelId);
    if (customModel && modelId) {
      return {
        id: modelId,
        info: {
          name: customModel.name,
          inputPrice: 0.0,
          outputPrice: 0.0,
          maxTokens: 4096,
          contextWindow: customModel.contextWindow,
          supportsImages: false,
          supportsPromptCache: false,
        }
      };
    }

    // Fallback to a generic model info
    return {
      id: "ollama",
      info: ollamaModels.ollama,
    };
  }
}
