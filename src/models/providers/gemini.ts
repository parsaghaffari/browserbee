import { GoogleGenAI, Content } from "@google/genai";
import { geminiModels, geminiDefaultModelId } from '../models';
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream } from './types';

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

  /**
   * Helper function to decode escaped HTML entities in a string
   * @param text The text to decode
   * @returns The decoded text
   */
  private decodeHtmlEntities(text: string): string {
    // Replace Unicode escape sequences with actual characters
    return text
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\u003c/g, '<')
      .replace(/\u003e/g, '>');
  }

  /**
   * Helper function to detect and extract tool calls from text with escaped HTML entities
   * @param text The text to check for tool calls
   * @returns An object with the extracted tool call if found, or null if not found
   */
  private extractToolCallFromText(text: string): { name: string, input: string, requiresApproval: boolean } | null {
    // Decode HTML entities first
    const decodedText = this.decodeHtmlEntities(text);

    // Check for tool call pattern
    const toolCallRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires_approval>(.*?)<\/requires_approval>/;
    const match = decodedText.match(toolCallRegex);

    if (match) {
      const [, name, input, requiresApprovalRaw] = match;
      return {
        name: name.trim(),
        input: input.trim(),
        requiresApproval: requiresApprovalRaw.trim().toLowerCase() === 'true'
      };
    }

    return null;
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

      // Process messages to ensure clean alternating pattern
      const processedMessages: any[] = [];
      let previousRole: string | null = null;

      // Process messages to combine consecutive messages of the same role
      for (const msg of messages) {
        // Skip empty messages
        if (!msg.content || msg.content === "") {
          console.log("Skipping empty message in conversation history");
          continue;
        }

        // Skip system instructions embedded in user messages
        if (msg.role === "user" && typeof msg.content === "string" &&
            msg.content.startsWith("[SYSTEM INSTRUCTION:")) {
          console.log("Skipping system instruction embedded in user message");
          continue;
        }

        const role = msg.role === "assistant" ? "model" : "user";

        // If this message has the same role as the previous one, combine them
        if (role === previousRole && processedMessages.length > 0) {
          const lastMsg = processedMessages[processedMessages.length - 1];
          // Combine the content with a newline separator
          const combinedText = lastMsg.parts[0].text + "\n\n" + msg.content;
          lastMsg.parts[0].text = combinedText;
        } else {
          // Add as a new message
          processedMessages.push({
            role: role,
            parts: [{ text: msg.content }]
          });
          previousRole = role;
        }
      }

      // Ensure we have alternating user-model messages
      // If we have two consecutive messages of the same role, add a placeholder message in between
      for (let i = 1; i < processedMessages.length; i++) {
        if (processedMessages[i].role === processedMessages[i-1].role) {
          // Insert a placeholder message
          const placeholderRole = processedMessages[i].role === "user" ? "model" : "user";
          const placeholderText = placeholderRole === "model" ? "I understand." : "Please continue.";
          processedMessages.splice(i, 0, {
            role: placeholderRole,
            parts: [{ text: placeholderText }]
          });
          i++; // Skip the newly inserted message
        }
      }

      // Convert to Gemini format
      let contents: Content[] = [];

      // Use the processed messages
      contents = processedMessages;

    try {
      // Configure options
      const config: any = {
        temperature: 0,
      };

      // Add system prompt as systemInstruction in config if not empty and not using cache
      if (systemPrompt && !useCache) {
        // System prompt will be passed in the config, not as a message
        config.systemInstruction = systemPrompt;
      }

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

      // Convert our tools to Gemini's function format if provided
      let geminiTools;
      if (tools && tools.length > 0) {
        geminiTools = {
          functionDeclarations: tools.map(tool => ({
            name: tool.name,
            description: tool.description || `Execute the ${tool.name} tool`,
            parameters: {
              type: "OBJECT",
              properties: {
                input: {
                  type: "STRING",
                  description: tool.name.includes("navigate") ?
                    "The URL to navigate to" :
                    "The input to the tool"
                },
                requires_approval: {
                  type: "BOOLEAN",
                  description: "Whether this tool call requires user approval"
                }
              },
              required: ["input"]
            }
          }))
        };
      }

      // Make sure we have at least one message in the contents array
      if (contents.length === 0) {
        // If no messages, add a default user message
        contents.push({
          role: "user",
          parts: [{ text: "Hello" }]
        });
      }

      // Send the message and get the stream
      // Use type assertion to bypass TypeScript error for tools property
      const params: any = {
        model: modelId,
        contents: contents,
        config,
      };

      // Add tools if provided
      if (geminiTools) {
        params.tools = geminiTools;

        // Add toolConfig to force function calling
        params.toolConfig = {
          functionCallingConfig: {
            mode: "ANY" // Use ANY mode to force the model to use function calls
          }
        };
      }

      const result = await this.client.models.generateContentStream(params);

      // Track usage metadata
      let lastUsageMetadata: any = null;

      // Process the stream
      for await (const chunk of result) {
        // Debug log to help diagnose response structure
        console.debug("Gemini chunk:", JSON.stringify(chunk));

        // Handle function calls at the top level (this is the key change)
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const functionCall of chunk.functionCalls) {
            const { name, args } = functionCall;

            // Convert to our XML format with null checks
            const input = args && args.input ? args.input : "";
            const requiresApproval = args && args.requires_approval === true ? "true" : "false";

            const xmlToolCall = `<tool>${name}</tool>\n<input>${input}</input>\n<requires_approval>${requiresApproval}</requires_approval>`;

            console.log("Found top-level function call:", name, args || {});
            yield {
              type: "text",
              text: xmlToolCall,
            };
          }
        }
        // Handle text chunks
        else if (chunk.text) {
          // Check if the text contains a tool call with escaped HTML entities
          const toolCall = this.extractToolCallFromText(chunk.text);

          if (toolCall) {
            // If a tool call is found, convert it to our XML format
            console.log("Found tool call in text with escaped HTML entities:", toolCall);
            const xmlToolCall = `<tool>${toolCall.name}</tool>\n<input>${toolCall.input}</input>\n<requires_approval>${toolCall.requiresApproval ? 'true' : 'false'}</requires_approval>`;

            yield {
              type: "text",
              text: xmlToolCall,
            };
          } else {
            // Otherwise, just yield the text as is
            yield {
              type: "text",
              text: chunk.text,
            };
          }
        }
        // Handle candidates with parts (which may contain executableCode or functionCall)
        else if (chunk.candidates && chunk.candidates.length > 0) {
          for (const candidate of chunk.candidates) {
            // Check for function calls in candidate.functionCall (some versions of the API put it here)
            // Use type assertion to bypass TypeScript error
            const candidateAny = candidate as any;
            if (candidateAny.functionCall) {
              const { name, args } = candidateAny.functionCall;

              // Convert to our XML format with null checks
              const input = args && args.input ? args.input : "";
              const requiresApproval = args && args.requires_approval === true ? "true" : "false";

              const xmlToolCall = `<tool>${name}</tool>\n<input>${input}</input>\n<requires_approval>${requiresApproval}</requires_approval>`;

              console.log("Found candidate function call:", name, args || {});
              yield {
                type: "text",
                text: xmlToolCall,
              };
            }
            // Process content parts
            else if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                // Handle function calls in parts (Gemini's native function calling format)
                // Use type assertion to bypass TypeScript error
                const partAny = part as any;
                if (partAny.functionCall) {
                  const { name, args } = partAny.functionCall;

                  // Convert to our XML format with null checks
                  const input = args && args.input ? args.input : "";
                  const requiresApproval = args && args.requires_approval === true ? "true" : "false";

                  const xmlToolCall = `<tool>${name}</tool>\n<input>${input}</input>\n<requires_approval>${requiresApproval}</requires_approval>`;

                  console.log("Found part function call:", name, args || {});
                  yield {
                    type: "text",
                    text: xmlToolCall,
                  };
                }
                // Handle executable code (legacy/fallback method)
                else if (part.executableCode && part.executableCode.code) {
                  // Only process if it's an XML tool call (starts with <tool>)
                  if (part.executableCode.code.trim().startsWith('<tool>')) {
                    console.log("Found XML tool call in executableCode:", part.executableCode.code);
                    yield {
                      type: "text",
                      text: part.executableCode.code,
                    };
                  } else {
                    console.log("Ignoring non-XML executableCode:", part.executableCode.code);
                  }
                } else if (part.text) {
                  // Check if the text contains a tool call with escaped HTML entities
                  const toolCall = this.extractToolCallFromText(part.text);

                  if (toolCall) {
                    // If a tool call is found, convert it to our XML format
                    console.log("Found tool call in part text with escaped HTML entities:", toolCall);
                    const xmlToolCall = `<tool>${toolCall.name}</tool>\n<input>${toolCall.input}</input>\n<requires_approval>${toolCall.requiresApproval ? 'true' : 'false'}</requires_approval>`;

                    yield {
                      type: "text",
                      text: xmlToolCall,
                    };
                  } else {
                    // Otherwise, just yield the text as is
                    yield {
                      type: "text",
                      text: part.text,
                    };
                  }
                }
              }
            }
          }
        }

        // Track usage metadata
        if (chunk.usageMetadata) {
          lastUsageMetadata = chunk.usageMetadata;
        }
      }

      // Yield final usage information
      if (lastUsageMetadata) {
        yield {
          type: "usage",
          inputTokens: lastUsageMetadata.promptTokenCount || 0,
          outputTokens: lastUsageMetadata.candidatesTokenCount || 0,
          cacheWriteTokens: lastUsageMetadata.cachedContentTokenCount || 0,
          cacheReadTokens: useCache ? (lastUsageMetadata.promptTokenCount || 0) : 0,
        };
      } else {
        // Fallback to estimated token usage if no metadata available
        console.warn("No usage metadata available from Gemini, using estimates");
        yield {
          type: "usage",
          inputTokens: Math.ceil(systemPrompt.length / 4) +
                       Math.ceil(messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0) / 4),
          outputTokens: 0,
        };
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
