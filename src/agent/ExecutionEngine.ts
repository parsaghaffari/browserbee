import { BrowserTool } from "./tools/types";
import { ToolManager } from "./ToolManager";
import { PromptManager } from "./PromptManager";
import { MemoryManager } from "./MemoryManager";
import { ErrorHandler } from "./ErrorHandler";
import { trimHistory } from "./TokenManager";
import { TokenTrackingService } from "../tracking/tokenTrackingService";
import { requestApproval } from "./approvalManager";
import { LLMProvider, StreamChunk } from "../models/providers/types";

// Constants
const MAX_STEPS = 50;            // prevent infinite loops
const MAX_OUTPUT_TOKENS = 1024;  // max tokens for LLM response

/**
 * Callback interface for execution
 */
export interface ExecutionCallbacks {
  onLlmChunk?: (s: string) => void;
  onLlmOutput: (s: string) => void;
  onToolOutput: (s: string) => void;
  onComplete: () => void;
  onError?: (error: any) => void;
  onToolStart?: (toolName: string, toolInput: string) => void;
  onToolEnd?: (result: string) => void;
  onSegmentComplete?: (segment: string) => void;
  onFallbackStarted?: () => void;
}

/**
 * Adapter for handling callbacks in both streaming and non-streaming modes
 */
class CallbackAdapter {
  private originalCallbacks: ExecutionCallbacks;
  private isStreaming: boolean;
  private buffer: string = '';
  
  constructor(callbacks: ExecutionCallbacks, isStreaming: boolean) {
    this.originalCallbacks = callbacks;
    this.isStreaming = isStreaming;
  }
  
  get adaptedCallbacks(): ExecutionCallbacks {
    return {
      onLlmChunk: this.handleLlmChunk.bind(this),
      onLlmOutput: this.originalCallbacks.onLlmOutput,
      onToolOutput: this.originalCallbacks.onToolOutput,
      onComplete: this.handleComplete.bind(this),
      onError: this.originalCallbacks.onError,
      onToolStart: this.originalCallbacks.onToolStart,
      onToolEnd: this.originalCallbacks.onToolEnd,
      onSegmentComplete: this.originalCallbacks.onSegmentComplete,
      onFallbackStarted: this.originalCallbacks.onFallbackStarted
    };
  }
  
  private handleLlmChunk(chunk: string): void {
    if (this.isStreaming && this.originalCallbacks.onLlmChunk) {
      // Pass through in streaming mode
      this.originalCallbacks.onLlmChunk(chunk);
    } else {
      // Buffer in non-streaming mode
      this.buffer += chunk;
    }
  }
  
  private handleComplete(): void {
    // In non-streaming mode, emit the full buffer at completion
    if (!this.isStreaming && this.buffer.length > 0) {
      this.originalCallbacks.onLlmOutput(this.buffer);
      this.buffer = '';
    }
    
    this.originalCallbacks.onComplete();
  }
}

/**
 * ExecutionEngine handles streaming execution logic, non-streaming execution logic,
 * and fallback mechanisms.
 */
export class ExecutionEngine {
  private llmProvider: LLMProvider;
  private toolManager: ToolManager;
  private promptManager: PromptManager;
  private memoryManager: MemoryManager;
  private errorHandler: ErrorHandler;
  
  constructor(
    llmProvider: LLMProvider,
    toolManager: ToolManager,
    promptManager: PromptManager,
    memoryManager: MemoryManager,
    errorHandler: ErrorHandler
  ) {
    this.llmProvider = llmProvider;
    this.toolManager = toolManager;
    this.promptManager = promptManager;
    this.memoryManager = memoryManager;
    this.errorHandler = errorHandler;
  }
  
  /**
   * Main execution method with fallback support
   */
  async executePromptWithFallback(
    prompt: string,
    callbacks: ExecutionCallbacks,
    initialMessages: any[] = []
  ): Promise<void> {
    const streamingSupported = await this.errorHandler.isStreamingSupported();
    const isStreaming = streamingSupported && callbacks.onLlmChunk !== undefined;
    
    try {
      // Use the execution method with appropriate streaming mode
      await this.executePrompt(prompt, callbacks, initialMessages, isStreaming);
    } catch (error) {
      console.warn("Execution failed, attempting fallback:", error);
      
      // Notify about fallback before switching modes
      if (callbacks.onFallbackStarted) {
        callbacks.onFallbackStarted();
      }
      
      // Check if this is a retryable error (rate limit or overloaded)
      if (this.errorHandler.isRetryableError(error)) {
        console.log("Retryable error detected in fallback handler:", error);
        // Ensure the error callback is called even during fallback
        if (callbacks.onError) {
          callbacks.onError(error);
        }
      }
      
      // Continue with fallback using non-streaming mode
      await this.executePrompt(prompt, callbacks, initialMessages, false);
    }
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
   * Execute prompt with support for both streaming and non-streaming modes
   */
  async executePrompt(
    prompt: string,
    callbacks: ExecutionCallbacks,
    initialMessages: any[] = [],
    isStreaming: boolean
  ): Promise<void> {
    // Create adapter to handle streaming vs non-streaming
    const adapter = new CallbackAdapter(callbacks, isStreaming);
    const adaptedCallbacks = adapter.adaptedCallbacks;
    
    // Reset cancel flag at the start of execution
    this.errorHandler.resetCancel();
    try {
      // Use initial messages if provided, otherwise start with just the prompt
      let messages: any[] = initialMessages.length > 0 
        ? [...initialMessages] 
        : [{ role: "user", content: prompt }];
      
      // If we have initial messages and the last one isn't the current prompt,
      // add the current prompt
      if (initialMessages.length > 0 && 
          (messages[messages.length - 1].role !== "user" || 
           messages[messages.length - 1].content !== prompt)) {
        messages.push({ role: "user", content: prompt });
      }

      let done = false;
      let step = 0;

      while (!done && step++ < MAX_STEPS && !this.errorHandler.isExecutionCancelled()) {
        try {
          // Check for cancellation before each major step
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 1. Call LLM with streaming ───────────────────────────────────────
          let accumulatedText = "";
          let streamBuffer = "";
          let toolCallDetected = false;
          
          // Get tools from the ToolManager
          const tools = this.toolManager.getTools();
          
          // Use provider interface instead of direct Anthropic API
          const stream = this.llmProvider.createMessage(
            this.promptManager.getSystemPrompt(),
            messages,
            tools
          );

          // Track token usage
          let inputTokens = 0;
          let outputTokens = 0;
          const tokenTracker = TokenTrackingService.getInstance();
          
          for await (const chunk of stream) {
            if (this.errorHandler.isExecutionCancelled()) break;
            
            // Track token usage
            if (chunk.type === 'usage') {
              // Debug log to help diagnose token tracking issues
              console.debug(`Token update: input=${chunk.inputTokens || 0}, output=${chunk.outputTokens || 0}, cacheWrite=${chunk.cacheWriteTokens || 0}, cacheRead=${chunk.cacheReadTokens || 0}`);
              
              // Handle input tokens (only from message_start)
              if (chunk.inputTokens) {
                inputTokens = chunk.inputTokens;
                // Track input tokens with cache tokens if available
                tokenTracker.trackInputTokens(
                  inputTokens,
                  {
                    write: chunk.cacheWriteTokens,
                    read: chunk.cacheReadTokens
                  }
                );
              }
              
              // Always track output tokens (from both message_start and message_delta)
              if (chunk.outputTokens) {
                const newOutputTokens = chunk.outputTokens;
                
                // Only track the delta (new tokens)
                if (newOutputTokens > outputTokens) {
                  const delta = newOutputTokens - outputTokens;
                  tokenTracker.trackOutputTokens(delta);
                  outputTokens = newOutputTokens;
                }
              }
            }
            
            // Handle text chunks
            if (chunk.type === 'text' && chunk.text) {
              const textChunk = chunk.text;
              accumulatedText += textChunk;
              streamBuffer += textChunk;
              
              // First, check if we have a complete tool call with requires_approval tag
              const completeToolCallRegex = /(```(?:xml|bash)\s*)?<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires_approval>(.*?)<\/requires_approval>(\s*```)?/;
              
              // Then, check for a basic tool call without requires_approval tag
              const basicToolCallRegex = /(```(?:xml|bash)\s*)?<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(\s*```)?/;
              
              // Check for a partial requires_approval tag (for streaming chunks that split mid-tag)
              // This regex matches both complete <requires_approval> and partial tags like <requires
              const partialApprovalRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires(_approval)?($|>)/;
              
              // Try to match the patterns in order of specificity
              const completeToolCallMatch = streamBuffer.match(completeToolCallRegex);
              
              // Only try to match basic tool call if complete match failed
              let basicToolCallMatch: RegExpMatchArray | null = null;
              if (!completeToolCallMatch) {
                basicToolCallMatch = streamBuffer.match(basicToolCallRegex);
              }
              
              // Only try to match partial approval if both previous matches failed
              let partialApprovalMatch: RegExpMatchArray | null = null;
              if (!completeToolCallMatch && !basicToolCallMatch) {
                partialApprovalMatch = streamBuffer.match(partialApprovalRegex);
              }
              
              // Check if we have a complete tool call with requires_approval
              if (completeToolCallMatch && !toolCallDetected) {
                toolCallDetected = true;
                console.log("Complete tool call with approval detected:", completeToolCallMatch);
                
                // Extract the tool call with requires_approval value
                const [fullMatch, codeBlockStart, toolName, toolInput, requiresApprovalRaw] = completeToolCallMatch;
                
                // Find the start of the tool call
                const matchIndex = codeBlockStart 
                  ? (streamBuffer.indexOf("```xml") !== -1 
                     ? streamBuffer.indexOf("```xml") 
                     : streamBuffer.indexOf("```bash"))
                  : streamBuffer.indexOf("<tool>");
                
                // Get text before the tool call
                const textBeforeToolCall = streamBuffer.substring(0, matchIndex);
                
                // Finalize the current segment
                if (textBeforeToolCall.trim() && adaptedCallbacks.onSegmentComplete) {
                  adaptedCallbacks.onSegmentComplete(textBeforeToolCall);
                }
                
                // Signal that a tool call is starting
                if (adaptedCallbacks.onToolStart) {
                  adaptedCallbacks.onToolStart(toolName.trim(), toolInput.trim());
                }
                
                // Clear the buffer
                streamBuffer = "";
                
                // Don't send any more chunks until tool execution is complete
                break;
              }
              // Check if we have a basic tool call without requires_approval
              else if (basicToolCallMatch && !toolCallDetected && !streamBuffer.includes("<requires_approval")) {
                // Only match if there's no partial requires_approval tag
                // This ensures we don't prematurely match a tool call that will eventually have requires_approval
                
                toolCallDetected = true;
                console.log("Basic tool call detected (no approval):", basicToolCallMatch);
                
                // Extract the tool call without requires_approval
                const [fullMatch, codeBlockStart, toolName, toolInput] = basicToolCallMatch;
                
                // Find the start of the tool call
                const matchIndex = codeBlockStart 
                  ? (streamBuffer.indexOf("```xml") !== -1 
                     ? streamBuffer.indexOf("```xml") 
                     : streamBuffer.indexOf("```bash"))
                  : streamBuffer.indexOf("<tool>");
                
                // Get text before the tool call
                const textBeforeToolCall = streamBuffer.substring(0, matchIndex);
                
                // Finalize the current segment
                if (textBeforeToolCall.trim() && adaptedCallbacks.onSegmentComplete) {
                  adaptedCallbacks.onSegmentComplete(textBeforeToolCall);
                }
                
                // Signal that a tool call is starting
                if (adaptedCallbacks.onToolStart) {
                  adaptedCallbacks.onToolStart(toolName.trim(), toolInput.trim());
                }
                
                // Clear the buffer
                streamBuffer = "";
                
                // Don't send any more chunks until tool execution is complete
                break;
              }
              // If we have a partial requires_approval tag, continue accumulating chunks
              else if (partialApprovalMatch !== null && !toolCallDetected) {
                console.log("Partial tool call with incomplete approval tag detected, waiting for more chunks");
                // Continue accumulating chunks, don't break yet
              }
              
              // If no tool call detected yet, continue sending chunks
              if (!toolCallDetected && adaptedCallbacks.onLlmChunk) {
                adaptedCallbacks.onLlmChunk(textChunk);
              }
            }
          }
          
          // After streaming completes, process the full response
          console.log("Streaming completed. Accumulated text length:", accumulatedText.length);
          
          // Decode any escaped HTML entities in the accumulated text
          accumulatedText = this.decodeHtmlEntities(accumulatedText);
          console.log("Decoded HTML entities in accumulated text");
          
          adaptedCallbacks.onLlmOutput(accumulatedText);
          
          // Check for cancellation after LLM response
          if (this.errorHandler.isExecutionCancelled()) break;

          // Check for truly interrupted tool calls (has input tag but interrupted during requires_approval)
          // This regex specifically looks for tool calls that end with <requires or <requires_approval
          const interruptedToolRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires(_approval)?$/;
          const interruptedToolMatch = accumulatedText.match(interruptedToolRegex);
          
          // Add a more specific check to ensure we only match truly interrupted tool calls
          if (interruptedToolMatch && 
              !interruptedToolMatch[0].includes("</requires_approval>") &&
              (interruptedToolMatch[0].endsWith("<requires") || 
               interruptedToolMatch[0].endsWith("<requires_approval"))) {
            // This is an interrupted tool call with a partial requires_approval tag
            const toolName = interruptedToolMatch[1].trim();
            const toolInput = interruptedToolMatch[2].trim();
            
            console.log("Detected interrupted tool call with partial requires_approval tag:", interruptedToolMatch[0]);
            console.log("Tool name:", toolName);
            console.log("Tool input:", toolInput);
            
            // Assume the LLM intended to set requires_approval to true
            adaptedCallbacks.onToolOutput(`⚠️ Detected interrupted tool call. Assuming approval is required.`);
            
            // Create a complete tool call with requires_approval=true
            const completeToolCall = `<tool>${toolName}</tool>\n<input>${toolInput}</input>\n<requires_approval>true</requires_approval>`;
            
            // Replace the interrupted tool call with the complete one
            accumulatedText = accumulatedText.replace(interruptedToolMatch[0], completeToolCall);
          }
          
          // ── 2. Parse for tool invocation ─────────────────────────────────────
          // First try to match a complete tool call with requires_approval
          const completeToolMatch = accumulatedText.match(
            /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>\s*<requires_approval>(.*?)<\/requires_approval>/
          );
          
          // If no complete match, try to match a basic tool call without requires_approval
          let basicToolMatch: RegExpMatchArray | null = null;
          if (!completeToolMatch) {
            basicToolMatch = accumulatedText.match(
              /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/
            );
          }
          
          // Use the complete match if available, otherwise use the basic match
          const toolMatch = completeToolMatch || basicToolMatch;

          // Check for incomplete tool calls (tool tag without input tag)
          const incompleteToolMatch = accumulatedText.match(/<tool>(.*?)<\/tool>(?!\s*<input>)/);
          if (incompleteToolMatch !== null && toolMatch === null) {
            // Handle incomplete tool call
            const toolName = incompleteToolMatch[1].trim();
            adaptedCallbacks.onToolOutput(`⚠️ Incomplete tool call detected: ${toolName} (missing input)`);
            
            // Add a message to prompt the LLM to complete the tool call
            messages.push(
              { role: "assistant", content: accumulatedText },
              { role: "user", content: `Error: Incomplete tool call. You provided <tool>${toolName}</tool> but no <input> tag. Please provide the complete tool call with both tags.` }
            );
            continue; // Continue to the next iteration
          }

          if (!toolMatch) {
            // no tool tag ⇒ task complete
            done = true;
            break;
          }

          // Extract tool information based on which match we found
          let toolName, toolInput, llmRequiresApproval;
          
          if (completeToolMatch) {
            const [, toolNameRaw, toolInputRaw, requiresApprovalRaw] = completeToolMatch;
            toolName = toolNameRaw.trim();
            toolInput = toolInputRaw.trim();
            llmRequiresApproval = requiresApprovalRaw.trim().toLowerCase() === 'true';
          } else {
            // For basic tool match without requires_approval tag
            const [, toolNameRaw, toolInputRaw] = basicToolMatch!;
            toolName = toolNameRaw.trim();
            toolInput = toolInputRaw.trim();
            llmRequiresApproval = false;
          }
          const tool = this.toolManager.findTool(toolName);
          
          // Check if the LLM has marked this as requiring approval
          const requiresApproval = llmRequiresApproval;
          const reason = llmRequiresApproval ? "The AI assistant has determined this action requires your approval." : "";

          if (!tool) {
            messages.push(
              { role: "assistant", content: accumulatedText },
              {
                role: "user",
                content: `Error: tool "${toolName}" not found. Available: ${this.toolManager.getTools()
                  .map((t) => t.name)
                  .join(", ")}`,
              }
            );
            continue;
          }

          // Check for cancellation before tool execution
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 3. Execute tool ──────────────────────────────────────────────────
          adaptedCallbacks.onToolOutput(`🕹️ tool: ${toolName} | args: ${toolInput}`);
          
          let result: string;
          
          if (requiresApproval) {
            // Notify the user that approval is required
            adaptedCallbacks.onToolOutput(`⚠️ This action requires approval: ${reason}`);
            
            // Get the current tab ID from chrome.tabs API
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const tabId = tabs[0]?.id || 0;
            
            try {
              // Request approval from the user
              const approved = await requestApproval(tabId, toolName, toolInput, reason);
              
              if (approved) {
                // User approved, execute the tool
                adaptedCallbacks.onToolOutput(`✅ Action approved by user. Executing...`);
                
                // Create a context object to pass to the tool
                const context = {
                  requiresApproval: true,
                  approvalReason: reason
                };
                
                // Execute the tool with the context
                result = await tool.func(toolInput, context);
              } else {
                // User rejected, skip execution
                result = "Action cancelled by user.";
                adaptedCallbacks.onToolOutput(`❌ Action rejected by user.`);
              }
            } catch (approvalError) {
              console.error(`Error in approval process:`, approvalError);
              result = "Error in approval process. Action cancelled.";
              adaptedCallbacks.onToolOutput(`❌ Error in approval process: ${approvalError}`);
            }
          } else {
            // No approval required, execute the tool normally
            result = await tool.func(toolInput);
          }
          
          // Signal that tool execution is complete
          if (adaptedCallbacks.onToolEnd) {
            adaptedCallbacks.onToolEnd(result);
          }

          // Check for cancellation after tool execution
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 4. Record turn & prune history ───────────────────────────────────
          messages.push(
            { role: "assistant", content: accumulatedText }
          );
          
          // Add the tool result to the message history
          try {
            // Try to parse the result as JSON to handle special formats
            const parsedResult = JSON.parse(result);
            
            // Handle screenshot references
            if (parsedResult.type === "screenshotRef" && parsedResult.id) {
              messages.push({
                role: "user",
                content: `Tool result: Screenshot captured (${parsedResult.id}). ${parsedResult.note || ''} Based on this image, please answer the user's original question: "${prompt}". Don't just describe the image - focus on answering the specific question or completing the task the user asked for.`
              });
            } else {
              // For other JSON results, stringify them nicely
              messages.push({ 
                role: "user", 
                content: `Tool result: ${JSON.stringify(parsedResult, null, 2)}` 
              });
            }
          } catch (error) {
            // If not valid JSON, add as plain text
            messages.push({ role: "user", content: `Tool result: ${result}` });
          }
          
          messages = trimHistory(messages);
        } catch (error) {
          // If an error occurs during execution, check if it was due to cancellation
          if (this.errorHandler.isExecutionCancelled()) break;
          throw error; // Re-throw if it wasn't a cancellation
        }
      }

      if (this.errorHandler.isExecutionCancelled()) {
        adaptedCallbacks.onLlmOutput(
          `\n\nExecution cancelled by user.`
        );
      } else if (step >= MAX_STEPS) {
        adaptedCallbacks.onLlmOutput(
          `Stopped: exceeded maximum of ${MAX_STEPS} steps.`
        );
      }
      adaptedCallbacks.onComplete();
    } catch (err: any) {
      // Check if this is a retryable error (rate limit or overloaded)
      if (this.errorHandler.isRetryableError(err)) {
        console.log("Retryable error detected:", err);
        // For retryable errors, notify but don't complete processing
        // This allows the fallback mechanism to retry while maintaining UI state
        if (adaptedCallbacks.onError) {
          adaptedCallbacks.onError(err);
        } else {
          adaptedCallbacks.onLlmOutput(this.errorHandler.formatErrorMessage(err));
        }
        
        // Notify about fallback before re-throwing
        if (adaptedCallbacks.onFallbackStarted) {
          adaptedCallbacks.onFallbackStarted();
        }
        
        // Get retry attempt from error if available, or default to 0
        const retryAttempt = (err as any).retryAttempt || 0;
        
        // Maximum number of retry attempts
        const MAX_RETRY_ATTEMPTS = 5;
        
        if (retryAttempt < MAX_RETRY_ATTEMPTS && !isStreaming) {
          // Only retry in non-streaming mode
          // Calculate backoff time using the ErrorHandler
          const backoffTime = this.errorHandler.calculateBackoffTime(err, retryAttempt);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          // Notify that we're retrying
          const errorType = this.errorHandler.isOverloadedError(err) ? 'server overload' : 'rate limit';
          adaptedCallbacks.onToolOutput(`Retrying after ${errorType} error (attempt ${retryAttempt + 1} of ${MAX_RETRY_ATTEMPTS})...`);
          
          // Increment retry attempt for the next try
          (err as any).retryAttempt = retryAttempt + 1;
          
          // Recursive retry with the same parameters
          return this.executePrompt(prompt, callbacks, initialMessages, isStreaming);
        } else if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
          // We've exceeded the maximum number of retry attempts
          adaptedCallbacks.onLlmOutput(
            `Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Please try again later.`
          );
          adaptedCallbacks.onComplete();
        } else {
          // In streaming mode, re-throw to trigger fallback
          throw err;
        }
      } else {
        // For other errors, show error and complete processing
        adaptedCallbacks.onLlmOutput(
          `Fatal error: ${err instanceof Error ? err.message : String(err)}`
        );
        adaptedCallbacks.onComplete();
        
        // In streaming mode, re-throw to trigger fallback
        if (isStreaming) {
          throw err;
        }
      }
    }
  }
}
