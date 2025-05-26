import OpenAI from "openai";
import { openaiModels, openaiDefaultModelId } from '../models';
import { LLMProvider, ProviderOptions, ModelInfo, ApiStream, StreamChunk } from './types';

export class OpenAIProvider implements LLMProvider {
  // Static method to get available models
  static getAvailableModels(): {id: string, name: string}[] {
    return Object.entries(openaiModels).map(([id, info]) => ({
      id,
      name: info.name
    }));
  }
  private options: ProviderOptions;
  private client: OpenAI;

  constructor(options: ProviderOptions) {
    this.options = options;
    this.client = new OpenAI({
      apiKey: this.options.apiKey,
      baseURL: this.options.baseUrl,
    });
  }

  async *createMessage(systemPrompt: string, messages: any[], tools?: any[]): ApiStream {
    const model = this.getModel();
    const modelId = model.id;

    // Process messages to filter out system instructions
    const filteredMessages = messages.filter(message => 
      !(message.role === "user" && 
        typeof message.content === "string" && 
        message.content.startsWith("[SYSTEM INSTRUCTION:"))
    );
    
    // Convert messages to OpenAI format
    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...filteredMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Configure options for the API request
    const options: any = {
      model: modelId,
      messages: openaiMessages,
      stream: true,
      stream_options: { include_usage: true }, // Enable usage tracking in the stream
    };
    
    // Check if this is a reasoning model family (o1, o3, o4)
    const isReasoningModelFamily = modelId.includes("o1") || modelId.includes("o3") || modelId.includes("o4");
    
    // Handle model-specific parameters
    if (isReasoningModelFamily || modelId.includes('gpt-4o')) {
      // Newer models like o1, o3, o4 use max_completion_tokens
      options.max_completion_tokens = model.info.maxTokens || 4096;
      
      // Some models like o3 and o4-mini don't support temperature=0
      if (modelId.includes('o3') || modelId.includes('o4-mini')) {
        // Don't set temperature for o3 or o4-mini (use default)
      } else {
        options.temperature = 0;
      }
    } else {
      // Older models use max_tokens and support temperature=0
      options.max_tokens = model.info.maxTokens || 4096;
      options.temperature = 0;
    }
    
    // Add thinking config if available and supported
    if (this.options.thinkingBudgetTokens && model.info.supportsPromptCache) {
      options.thinking = {
        enabled: true,
        budget_tokens: this.options.thinkingBudgetTokens,
      };
      
      // Temperature must be undefined when thinking is enabled
      options.temperature = undefined;
    }

    // Add tools configuration if tools are provided
    if (tools && tools.length > 0) {
      // Convert tools to OpenAI format
      const openAITools = tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: {
              input: {
                type: "string",
                description: "The input to the tool"
              },
              requires_approval: {
                type: "boolean",
                description: "Whether this tool call requires user approval"
              }
            },
            required: ["input"]
          }
        }
      }));
      
      options.tools = openAITools;
      options.tool_choice = "auto";
    }

    try {
      // Create the stream and assert it as an AsyncIterable
      const stream = await this.client.chat.completions.create(options) as unknown as AsyncIterable<any>;

      // Process the stream
      let toolCallId = null;
      let toolName = null;
      let toolArguments = null;
      let isCollectingToolCall = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // Handle text content
        if (delta?.content) {
          yield {
            type: "text",
            text: delta.content,
          };
        }

        // Handle tool calls
        if (delta?.tool_calls && delta.tool_calls.length > 0) {
          const toolCall = delta.tool_calls[0];
          
          // If this is the start of a tool call
          if (toolCall.index === 0 && toolCall.function?.name) {
            isCollectingToolCall = true;
            toolCallId = toolCall.id;
            toolName = toolCall.function.name;
            toolArguments = toolCall.function.arguments || "";
          } 
          // If we're continuing to collect a tool call
          else if (isCollectingToolCall && toolCall.function?.arguments) {
            toolArguments += toolCall.function.arguments;
          }
          
          // If this is the end of the tool call (finish_reason: "tool_calls")
          if (chunk.choices[0]?.finish_reason === "tool_calls" && isCollectingToolCall) {
            try {
              // Try to parse the arguments as a single JSON object
              let args;
              try {
                args = JSON.parse(toolArguments || "{}");
              } catch (parseError) {
                // If parsing fails, check if we have multiple concatenated JSON objects
                const jsonObjects = toolArguments.split(/(?<=\})(?=\{)/);
                if (jsonObjects.length > 1) {
                  console.log(`Found ${jsonObjects.length} concatenated JSON objects, using the first one`);
                  // Parse just the first object
                  args = JSON.parse(jsonObjects[0]);
                } else {
                  // Second attempt: sanitize and try again
                  console.log("Attempting to sanitize tool arguments before parsing");
                  // Replace double quotes in CSS selectors with single quotes
                  const sanitizedArgs = toolArguments
                    .replace(/(\w+)\[name="([^"]+)"\]/g, '$1[name=\'$2\']')
                    .replace(/(\w+)\[class="([^"]+)"\]/g, '$1[class=\'$2\']')
                    .replace(/(\w+)\[id="([^"]+)"\]/g, '$1[id=\'$2\']')
                    .replace(/(\w+)\[type="([^"]+)"\]/g, '$1[type=\'$2\']')
                    .replace(/(\w+)\[value="([^"]+)"\]/g, '$1[value=\'$2\']');
                  
                  try {
                    args = JSON.parse(sanitizedArgs);
                    console.log("Successfully parsed sanitized tool arguments");
                  } catch (secondError) {
                    console.error("Error parsing sanitized tool arguments:", secondError);
                    
                    // Third attempt: use regex to extract the input directly
                    const inputMatch = toolArguments.match(/"input"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                    const requiresApprovalMatch = toolArguments.match(/"requires_approval"\s*:\s*(true|false)/);
                    
                    if (inputMatch) {
                      console.log("Extracted input using regex");
                      args = {
                        input: inputMatch[1].replace(/\\"/g, '"'),
                        requires_approval: requiresApprovalMatch ? 
                          requiresApprovalMatch[1] === 'true' : false
                      };
                    } else {
                      throw secondError; // If we can't extract the input, re-throw
                    }
                  }
                }
              }
              
              const input = args.input || "";
              const requiresApproval = args.requires_approval === true ? "true" : "false";
              
              // Format as XML
              const xmlToolCall = `<tool>${toolName}</tool>\n<input>${input}</input>\n<requires_approval>${requiresApproval}</requires_approval>`;
              
              yield {
                type: "text",
                text: xmlToolCall,
              };
              
              // Reset tool call collection
              isCollectingToolCall = false;
              toolCallId = null;
              toolName = null;
              toolArguments = null;
            } catch (error) {
              console.error("Error parsing tool arguments:", error);
              yield {
                type: "text",
                text: "Error: Failed to parse tool call. Please try again.",
              };
            }
          }
        }

        // Handle usage information
        if (chunk.usage) {
          yield {
            type: "usage",
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
          };
        }
      }
      
      // If we collected a tool call but didn't finish it (rare case)
      if (isCollectingToolCall && toolName) {
        try {
          // Try to parse the arguments as a single JSON object
          let args;
          try {
            args = JSON.parse(toolArguments || "{}");
          } catch (parseError) {
            // If parsing fails, check if we have multiple concatenated JSON objects
            const jsonObjects = toolArguments.split(/(?<=\})(?=\{)/);
            if (jsonObjects.length > 1) {
              console.log(`Found ${jsonObjects.length} concatenated JSON objects in unfinished tool call, using the first one`);
              // Parse just the first object
              args = JSON.parse(jsonObjects[0]);
            } else {
              // Second attempt: sanitize and try again
              console.log("Attempting to sanitize unfinished tool arguments before parsing");
              // Replace double quotes in CSS selectors with single quotes
              const sanitizedArgs = toolArguments
                .replace(/(\w+)\[name="([^"]+)"\]/g, '$1[name=\'$2\']')
                .replace(/(\w+)\[class="([^"]+)"\]/g, '$1[class=\'$2\']')
                .replace(/(\w+)\[id="([^"]+)"\]/g, '$1[id=\'$2\']')
                .replace(/(\w+)\[type="([^"]+)"\]/g, '$1[type=\'$2\']')
                .replace(/(\w+)\[value="([^"]+)"\]/g, '$1[value=\'$2\']');
              
              try {
                args = JSON.parse(sanitizedArgs);
                console.log("Successfully parsed sanitized unfinished tool arguments");
              } catch (secondError) {
                console.error("Error parsing sanitized unfinished tool arguments:", secondError);
                
                // Third attempt: use regex to extract the input directly
                const inputMatch = toolArguments.match(/"input"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                const requiresApprovalMatch = toolArguments.match(/"requires_approval"\s*:\s*(true|false)/);
                
                if (inputMatch) {
                  console.log("Extracted input using regex from unfinished tool call");
                  args = {
                    input: inputMatch[1].replace(/\\"/g, '"'),
                    requires_approval: requiresApprovalMatch ? 
                      requiresApprovalMatch[1] === 'true' : false
                  };
                } else {
                  throw secondError; // If we can't extract the input, re-throw
                }
              }
            }
          }
          
          const input = args.input || "";
          const requiresApproval = args.requires_approval === true ? "true" : "false";
          
          // Format as XML
          const xmlToolCall = `<tool>${toolName}</tool>\n<input>${input}</input>\n<requires_approval>${requiresApproval}</requires_approval>`;
          
          yield {
            type: "text",
            text: xmlToolCall,
          };
        } catch (error) {
          console.error("Error parsing tool arguments (unfinished):", error);
          yield {
            type: "text",
            text: "Error: Failed to parse tool call. Please try again.",
          };
        }
      }
    } catch (error) {
      console.error("Error in OpenAI stream:", error);
      yield {
        type: "text",
        text: "Error: Failed to stream response from OpenAI API. Please try again.",
      };
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    const modelId = this.options.apiModelId || openaiDefaultModelId;
    
    // Check if the model ID exists in our models, otherwise use the default
    const safeModelId = Object.keys(openaiModels).includes(modelId) 
      ? modelId as keyof typeof openaiModels 
      : openaiDefaultModelId;
    
    return {
      id: modelId,
      info: openaiModels[safeModelId],
    };
  }
}
