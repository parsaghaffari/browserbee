import { GoogleGenAI, Content } from "@google/genai";
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream, StreamChunk } from './types';
import { geminiModels, geminiDefaultModelId } from '../models';

// Define a default TTL for the cache (e.g., 1 hour in seconds)
const DEFAULT_CACHE_TTL_SECONDS = 3600;

export class GeminiProvider implements LLMProvider {
  // Static method to get available models
  static getAvailableModels(): {id: string, name: string}[] {
    return Object.entries(geminiModels).map(([id, info]) => ({
      id,
      name: info.name
    }));
  }
  
  private options: ProviderOptions;
  private client: GoogleGenAI;
  
  // Internal state for caching
  private cacheName: string | null = null;
  private cacheExpireTime: number | null = null;
  private isFirstApiCall = true;

  constructor(options: ProviderOptions) {
    this.options = options;
    this.client = new GoogleGenAI({ apiKey: this.options.apiKey });
  }

  async *createMessage(systemPrompt: string, messages: any[], tools?: any[]): ApiStream {
    // Get model info to check for thinking config
    const model = this.getModel();
    const modelId = model.id;
    const modelInfo = model.info;
    
    // --- Cache Handling Logic ---
    const isCacheValid = this.cacheName && this.cacheExpireTime && Date.now() < this.cacheExpireTime;
    let useCache = !this.isFirstApiCall && isCacheValid;

    if (this.isFirstApiCall && !isCacheValid && systemPrompt) {
      // It's the first call, no valid cache exists, and we have a system prompt
      this.isFirstApiCall = false;

      // Minimum token check heuristic (simple length check for now)
      // Assume a generous average of 4 chars/token. 4096 tokens * 4 chars/token = 16384 chars.
      const MIN_SYSTEM_PROMPT_LENGTH_FOR_CACHE = 16384;
      if (systemPrompt.length >= MIN_SYSTEM_PROMPT_LENGTH_FOR_CACHE) {
        // Start cache creation asynchronously
        this.createCacheInBackground(modelId, systemPrompt);
      }
      // Proceed without using the cache, as it's being created
      useCache = false;
    } else if (!isCacheValid && this.cacheName) {
      // Cache exists but has expired
      this.cacheName = null;
      this.cacheExpireTime = null;
      useCache = false;
    }
    // --- End Cache Handling Logic ---
    
    // Convert messages to Gemini format
    const contents: Content[] = [];
    
    // Add system prompt as first user message if not empty and not using cache
    if (systemPrompt && !useCache) {
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt }],
      });
      
      // Add a placeholder assistant response after system prompt
      contents.push({
        role: "model",
        parts: [{ text: "I'll follow these instructions." }],
      });
    }
    
    // Add the rest of the messages
    for (const msg of messages) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    try {
      // Configure options
      const config: any = {
        temperature: 0,
      };
      
      // Add thinking config if available and budget is set
      if (modelInfo.thinkingConfig && this.options.thinkingBudgetTokens) {
        config.thinkingConfig = {
          thinkingBudget: Math.min(
            this.options.thinkingBudgetTokens,
            modelInfo.thinkingConfig.maxBudget || 24576
          ),
        };
      }
      
      // Add base URL if provided
      if (this.options.baseUrl) {
        config.httpOptions = { baseUrl: this.options.baseUrl };
      }
      
      // Add cache if available
      if (useCache && this.cacheName) {
        config.cachedContent = this.cacheName;
      }

      // Get the last message (current user query)
      const lastMessage = contents.pop();
      
      // Only proceed if the last message is from the user
      if (!lastMessage || lastMessage.role !== "user") {
        throw new Error("Last message must be from the user");
      }
      
      // Send the message and get the stream
      const result = await this.client.models.generateContentStream({
        model: modelId,
        contents: contents.length > 0 ? contents : [],
        ...lastMessage,
        config,
      });
      
      let totalOutputTokens = 0;
      
      // Process the stream
      for await (const chunk of result) {
        if (chunk.text) {
          yield {
            type: "text",
            text: chunk.text,
          };
          
          // Estimate token usage (Gemini doesn't provide this in stream)
          // Rough estimate: 1 token ≈ 4 characters
          const estimatedTokens = Math.ceil(chunk.text.length / 4);
          totalOutputTokens += estimatedTokens;
          
          yield {
            type: "usage",
            inputTokens: 0,
            outputTokens: totalOutputTokens,
          };
        }
      }
    } catch (error) {
      console.error("Error in Gemini stream:", error);
      yield {
        type: "text",
        text: "Error: Failed to stream response from Gemini API. Please try again.",
      };
    }
  }
  
  /**
   * Create a cache in the background for future requests
   */
  private async createCacheInBackground(modelId: string, systemInstruction: string): Promise<void> {
    try {
      // Check if the client has a caches property
      if ('caches' in this.client) {
        const cache = await this.client.caches.create({
          model: modelId,
          config: {
            systemInstruction: systemInstruction,
            ttl: `${DEFAULT_CACHE_TTL_SECONDS}s`,
          },
        });

        if (cache?.name) {
          this.cacheName = cache.name;
          // Calculate expiry timestamp
          this.cacheExpireTime = Date.now() + DEFAULT_CACHE_TTL_SECONDS * 1000;
          console.log(`Created Gemini cache: ${this.cacheName}`);
        } else {
          console.warn("Gemini cache creation call succeeded but returned no cache name.");
        }
      } else {
        console.warn("Gemini client does not support caching");
      }
    } catch (error) {
      console.error("Failed to create Gemini cache in background:", error);
      // Reset state if creation failed
      this.cacheName = null;
      this.cacheExpireTime = null;
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    const modelId = this.options.apiModelId || geminiDefaultModelId;
    
    // Check if the model ID exists in our models, otherwise use the default
    const safeModelId = Object.keys(geminiModels).includes(modelId) 
      ? modelId as keyof typeof geminiModels 
      : geminiDefaultModelId;
    
    return {
      id: modelId,
      info: geminiModels[safeModelId],
    };
  }
}
