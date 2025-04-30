import Anthropic from "@anthropic-ai/sdk";
import { BrowserTool } from "./tools/types";
import { ToolManager } from "./ToolManager";
import { PromptManager } from "./PromptManager";
import { MemoryManager } from "./MemoryManager";
import { ErrorHandler } from "./ErrorHandler";
import { trimHistory } from "./TokenManager";
import { ScreenshotManager } from "../tracking/screenshotManager";
import { TokenTrackingService } from "../tracking/tokenTrackingService";
import { requestApproval } from "./approvalManager";

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
 * ExecutionEngine handles streaming execution logic, non-streaming execution logic,
 * and fallback mechanisms.
 */
export class ExecutionEngine {
  private anthropic: Anthropic;
  private toolManager: ToolManager;
  private promptManager: PromptManager;
  private memoryManager: MemoryManager;
  private errorHandler: ErrorHandler;
  
  constructor(
    anthropic: Anthropic,
    toolManager: ToolManager,
    promptManager: PromptManager,
    memoryManager: MemoryManager,
    errorHandler: ErrorHandler
  ) {
    this.anthropic = anthropic;
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
    initialMessages: Anthropic.MessageParam[] = []
  ): Promise<void> {
    const streamingSupported = await this.errorHandler.isStreamingSupported();
    
    if (streamingSupported && callbacks.onLlmChunk) {
      try {
        await this.executePromptWithStreaming(prompt, callbacks, initialMessages);
      } catch (error) {
        console.warn("Streaming failed, falling back to non-streaming mode:", error);
        
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
        
        // Continue with fallback
        await this.executePrompt(prompt, callbacks, initialMessages);
      }
    } else {
      // Directly use non-streaming mode
      await this.executePrompt(prompt, callbacks, initialMessages);
    }
  }
  
  /**
   * Streaming version of the prompt execution
   */
  async executePromptWithStreaming(
    prompt: string,
    callbacks: ExecutionCallbacks,
    initialMessages: Anthropic.MessageParam[] = []
  ): Promise<void> {
    // Reset cancel flag at the start of execution
    this.errorHandler.resetCancel();
    try {
      // Use initial messages if provided, otherwise start with just the prompt
      let messages: Anthropic.MessageParam[] = initialMessages.length > 0 
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
          
          const stream = await this.anthropic.messages.stream({
            model: "claude-3-7-sonnet-20250219",
            system: this.promptManager.getSystemPrompt(),
            temperature: 0,
            max_tokens: MAX_OUTPUT_TOKENS,
            messages,
          });

          // Track token usage
          let inputTokens = 0;
          let outputTokens = 0;
          const tokenTracker = TokenTrackingService.getInstance();
          
          for await (const chunk of stream) {
            if (this.errorHandler.isExecutionCancelled()) break;
            
            // Track token usage from message_start event
            if (chunk.type === 'message_start' && chunk.message && chunk.message.usage) {
              inputTokens = chunk.message.usage.input_tokens || 0;
              tokenTracker.trackInputTokens(inputTokens);
            }
            
            // Track token usage from message_delta event
            if (chunk.type === 'message_delta' && chunk.usage && chunk.usage.output_tokens) {
              const newOutputTokens = chunk.usage.output_tokens;
              
              // Only track the delta (new tokens)
              if (newOutputTokens > outputTokens) {
                const delta = newOutputTokens - outputTokens;
                tokenTracker.trackOutputTokens(delta);
                outputTokens = newOutputTokens;
              }
            }
            
            // Handle content block deltas (text chunks)
            if (chunk.type === 'content_block_delta' && 
                chunk.delta.type === 'text_delta' &&
                'text' in chunk.delta) {
              const textChunk = chunk.delta.text;
              accumulatedText += textChunk;
              streamBuffer += textChunk;
              
              // Check if we've detected a complete tool call in the buffer
              // Include the optional requires_approval tag in the pattern
              const toolCallMatch = streamBuffer.match(/<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?:\s*<requires_approval>(.*?)<\/requires_approval>)/);
              
              if (toolCallMatch && !toolCallDetected) {
                toolCallDetected = true;
                console.log("Tool call detected:", toolCallMatch);
                
                // Extract the tool call, including the optional requires_approval value
                const [fullMatch, toolName, toolInput, requiresApprovalRaw] = toolCallMatch;
                const matchIndex = streamBuffer.indexOf(fullMatch);
                
                // Get text before the tool call
                const textBeforeToolCall = streamBuffer.substring(0, matchIndex);
                
                // Finalize the current segment
                if (textBeforeToolCall.trim() && callbacks.onSegmentComplete) {
                  callbacks.onSegmentComplete(textBeforeToolCall);
                }
                
                // Signal that a tool call is starting
                if (callbacks.onToolStart) {
                  callbacks.onToolStart(toolName.trim(), toolInput.trim());
                }
                
                // Clear the buffer
                streamBuffer = "";
                
                // Don't send any more chunks until tool execution is complete
                break;
              }
              
              // If no tool call detected yet, continue sending chunks
              if (!toolCallDetected && callbacks.onLlmChunk) {
                callbacks.onLlmChunk(textChunk);
              }
            }
          }
          
          // After streaming completes, process the full response
          callbacks.onLlmOutput(accumulatedText);
          
          // Check for cancellation after LLM response
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 2. Parse for tool invocation ─────────────────────────────────────
          const toolMatch = accumulatedText.match(
            /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?:\s*<requires_approval>(.*?)<\/requires_approval>)?/
          );

          // Check for incomplete tool calls (tool tag without input tag)
          const incompleteToolMatch = accumulatedText.match(/<tool>(.*?)<\/tool>(?!\s*<input>)/);
          if (incompleteToolMatch && !toolMatch) {
            // Handle incomplete tool call
            const toolName = incompleteToolMatch[1].trim();
            callbacks.onToolOutput(`⚠️ Incomplete tool call detected: ${toolName} (missing input)`);
            
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

          const [, toolNameRaw, toolInputRaw, requiresApprovalRaw] = toolMatch;
          const toolName = toolNameRaw.trim();
          const toolInput = toolInputRaw.trim();
          const llmRequiresApproval = requiresApprovalRaw ? requiresApprovalRaw.trim().toLowerCase() === 'true' : false;
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
          callbacks.onToolOutput(`🕹️ tool: ${toolName} | args: ${toolInput}`);
          
          let result: string;
          
          if (requiresApproval) {
            // Notify the user that approval is required
            callbacks.onToolOutput(`⚠️ This action requires approval: ${reason}`);
            
            // Get the current tab ID from chrome.tabs API
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const tabId = tabs[0]?.id || 0;
            
            // Request approval from the user
            const approved = await requestApproval(tabId, toolName, toolInput, reason);
            
            if (approved) {
              // User approved, execute the tool
              callbacks.onToolOutput(`✅ Action approved by user. Executing...`);
              
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
              callbacks.onToolOutput(`❌ Action rejected by user.`);
            }
          } else {
            // No approval required, execute the tool normally
            result = await tool.func(toolInput);
          }
          
          // Signal that tool execution is complete
          if (callbacks.onToolEnd) {
            callbacks.onToolEnd(result);
          }

          // Check for cancellation after tool execution
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 4. Record turn & prune history ───────────────────────────────────
          messages.push(
            { role: "assistant", content: accumulatedText }
          );
          
          // Special handling for screenshot results
          if (toolName === "browser_screenshot") {
            try {
              // Parse the JSON result from the screenshot tool
              const screenshotData = JSON.parse(result);
              
              // Check if it has the expected structure
              if (screenshotData.type === "image" && 
                  screenshotData.source && 
                  screenshotData.source.type === "base64" &&
                  screenshotData.source.media_type === "image/jpeg" &&
                  screenshotData.source.data) {
                
                // Store the screenshot in the ScreenshotManager
                const screenshotManager = ScreenshotManager.getInstance();
                const screenshotId = screenshotManager.storeScreenshot(screenshotData);
                
                // Log the screenshot storage
                console.log(`Stored screenshot as ${screenshotId} (saved ${screenshotData.source.data.length} characters)`);
                
                // Add a reference to the screenshot instead of the full data
                messages.push({
                  role: "user",
                  content: `Tool result: Screenshot captured (${screenshotId}). Based on this image, please answer the user's original question: "${prompt}". Don't just describe the image - focus on answering the specific question or completing the task the user asked for.`
                });
                
                // Note: The actual screenshot is still sent to the UI via the onToolEnd callback,
                // but we're not including it in the message history to save tokens
              } else {
                // Fallback if the structure isn't as expected
                messages.push({ role: "user", content: `Tool result: ${result}` });
                console.log("Screenshot data didn't have the expected structure, sending as text");
              }
            } catch (error) {
              // Fallback if parsing fails
              messages.push({ role: "user", content: `Tool result: ${result}` });
              console.error("Failed to parse screenshot result as JSON:", error);
            }
          } else {
            // Normal handling for other tools
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
        callbacks.onLlmOutput(
          `\n\nExecution cancelled by user.`
        );
      } else if (step >= MAX_STEPS) {
        callbacks.onLlmOutput(
          `Stopped: exceeded maximum of ${MAX_STEPS} steps.`
        );
      }
      callbacks.onComplete();
    } catch (err: any) {
      // Check if this is a retryable error (rate limit or overloaded)
      if (this.errorHandler.isRetryableError(err)) {
        console.log("Retryable error detected in streaming mode:", err);
        // For retryable errors, notify but don't complete processing
        // This allows the fallback mechanism to retry while maintaining UI state
        if (callbacks.onError) {
          callbacks.onError(err);
        } else {
          callbacks.onLlmOutput(this.errorHandler.formatErrorMessage(err));
        }
        
        // Notify about fallback before re-throwing
        if (callbacks.onFallbackStarted) {
          callbacks.onFallbackStarted();
        }
      } else {
        // For other errors, show error and complete processing
        callbacks.onLlmOutput(
          `Fatal error: ${err instanceof Error ? err.message : String(err)}`
        );
        callbacks.onComplete();
      }
      throw err; // Re-throw to trigger fallback
    }
  }
  
  /**
   * Non-streaming version of the prompt execution
   */
  async executePrompt(
    prompt: string,
    callbacks: ExecutionCallbacks,
    initialMessages: Anthropic.MessageParam[] = []
  ): Promise<void> {
    // Reset cancel flag at the start of execution
    this.errorHandler.resetCancel();
    try {
      // Use initial messages if provided, otherwise start with just the prompt
      let messages: Anthropic.MessageParam[] = initialMessages.length > 0 
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

          // ── 1. Call LLM ───────────────────────────────────────────────────────
          // Track token usage
          const tokenTracker = TokenTrackingService.getInstance();
          
          const responsePromise = this.anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            system: this.promptManager.getSystemPrompt(),
            temperature: 0,
            max_tokens: MAX_OUTPUT_TOKENS,
            messages,
          });

          // Set up a check for cancellation during LLM call
          const checkCancellation = async () => {
            while (!this.errorHandler.isExecutionCancelled()) {
              await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
            }
            // If we get here, cancellation was requested
            return null;
          };

          // Race between the LLM response and cancellation
          const response = await Promise.race([
            responsePromise,
            checkCancellation().then(() => null)
          ]);

          // If cancelled during LLM call
          if (this.errorHandler.isExecutionCancelled() || !response) {
            break;
          }

          // Track token usage from response
          if (response.usage) {
            const inputTokens = response.usage.input_tokens || 0;
            const outputTokens = response.usage.output_tokens || 0;
            
            tokenTracker.trackInputTokens(inputTokens);
            tokenTracker.trackOutputTokens(outputTokens);
          }

          const firstChunk = response.content[0];
          const assistantText =
            firstChunk.type === "text"
              ? firstChunk.text
              : JSON.stringify(firstChunk);

          callbacks.onLlmOutput(assistantText);

          // Check for cancellation after LLM response
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 2. Parse for tool invocation ─────────────────────────────────────
          const toolMatch = assistantText.match(
            /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?:\s*<requires_approval>(.*?)<\/requires_approval>)/
          );

          // Check for incomplete tool calls (tool tag without input tag)
          const incompleteToolMatch = assistantText.match(/<tool>(.*?)<\/tool>(?!\s*<input>)/);
          if (incompleteToolMatch && !toolMatch) {
            // Handle incomplete tool call
            const toolName = incompleteToolMatch[1].trim();
            callbacks.onToolOutput(`⚠️ Incomplete tool call detected: ${toolName} (missing input)`);
            
            // Add a message to prompt the LLM to complete the tool call
            messages.push(
              { role: "assistant", content: assistantText },
              { role: "user", content: `Error: Incomplete tool call. You provided <tool>${toolName}</tool> but no <input> tag. Please provide the complete tool call with both tags.` }
            );
            continue; // Continue to the next iteration
          }

          if (!toolMatch) {
            // no tool tag ⇒ task complete
            done = true;
            break;
          }

          const [, toolNameRaw, toolInputRaw, requiresApprovalRaw] = toolMatch;
          const toolName = toolNameRaw.trim();
          const toolInput = toolInputRaw.trim();
          const llmRequiresApproval = requiresApprovalRaw ? requiresApprovalRaw.trim().toLowerCase() === 'true' : false;
          const tool = this.toolManager.findTool(toolName);

          if (!tool) {
            messages.push(
              { role: "assistant", content: assistantText },
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
          callbacks.onToolOutput(`🕹️ tool: ${toolName} | args: ${toolInput}`);
          
          let result: string;
          
          if (llmRequiresApproval) {
            const reason = "The AI assistant has determined this action requires your approval.";
            // Notify the user that approval is required
            callbacks.onToolOutput(`⚠️ This action requires approval: ${reason}`);
            
            // Get the current tab ID from chrome.tabs API
            const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            const tabId = tabs[0]?.id || 0;
            
            // Request approval from the user
            const approved = await requestApproval(tabId, toolName, toolInput, reason);
            
            if (approved) {
              // User approved, execute the tool
              callbacks.onToolOutput(`✅ Action approved by user. Executing...`);
              
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
              callbacks.onToolOutput(`❌ Action rejected by user.`);
            }
          } else {
            // No approval required, execute the tool normally
            result = await tool.func(toolInput);
          }

          // Check for cancellation after tool execution
          if (this.errorHandler.isExecutionCancelled()) break;

          // ── 4. Record turn & prune history ───────────────────────────────────
          messages.push(
            { role: "assistant", content: assistantText }
          );
          
          // Special handling for screenshot results
          if (toolName === "browser_screenshot") {
            try {
              // Parse the JSON result from the screenshot tool
              const screenshotData = JSON.parse(result);
              
              // Check if it has the expected structure
              if (screenshotData.type === "image" && 
                  screenshotData.source && 
                  screenshotData.source.type === "base64" &&
                  screenshotData.source.media_type === "image/jpeg" &&
                  screenshotData.source.data) {
                
                // Store the screenshot in the ScreenshotManager
                const screenshotManager = ScreenshotManager.getInstance();
                const screenshotId = screenshotManager.storeScreenshot(screenshotData);
                
                // Log the screenshot storage
                console.log(`Stored screenshot as ${screenshotId} (saved ${screenshotData.source.data.length} characters)`);
                
                // Add a reference to the screenshot instead of the full data
                messages.push({
                  role: "user",
                  content: `Tool result: Screenshot captured (${screenshotId}). Based on this image, please answer the user's original question: "${prompt}". Don't just describe the image - focus on answering the specific question or completing the task the user asked for.`
                });
                
                // Note: The actual screenshot is still sent to the UI via the onToolEnd callback,
                // but we're not including it in the message history to save tokens
              } else {
                // Fallback if the structure isn't as expected
                messages.push({ role: "user", content: `Tool result: ${result}` });
                console.log("Screenshot data didn't have the expected structure, sending as text");
              }
            } catch (error) {
              // Fallback if parsing fails
              messages.push({ role: "user", content: `Tool result: ${result}` });
              console.error("Failed to parse screenshot result as JSON:", error);
            }
          } else {
            // Normal handling for other tools
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
        callbacks.onLlmOutput(
          `\n\nExecution cancelled by user.`
        );
      } else if (step >= MAX_STEPS) {
        callbacks.onLlmOutput(
          `Stopped: exceeded maximum of ${MAX_STEPS} steps.`
        );
      }
      callbacks.onComplete();
    } catch (err: any) {
      // Check if this is a retryable error (rate limit or overloaded)
      if (this.errorHandler.isRetryableError(err)) {
        console.log("Retryable error detected in non-streaming mode:", err);
        // For retryable errors, notify but don't complete processing
        if (callbacks.onError) {
          callbacks.onError(err);
        } else {
          callbacks.onLlmOutput(this.errorHandler.formatErrorMessage(err));
        }
        
        // Get retry attempt from error if available, or default to 0
        const retryAttempt = (err as any).retryAttempt || 0;
        
        // Maximum number of retry attempts
        const MAX_RETRY_ATTEMPTS = 5;
        
        if (retryAttempt < MAX_RETRY_ATTEMPTS) {
          // Calculate backoff time using the ErrorHandler
          const backoffTime = this.errorHandler.calculateBackoffTime(err, retryAttempt);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          // Notify that we're retrying
          const errorType = this.errorHandler.isOverloadedError(err) ? 'server overload' : 'rate limit';
          callbacks.onToolOutput(`Retrying after ${errorType} error (attempt ${retryAttempt + 1} of ${MAX_RETRY_ATTEMPTS})...`);
          
          // Increment retry attempt for the next try
          (err as any).retryAttempt = retryAttempt + 1;
          
          // Recursive retry with the same parameters
          return this.executePrompt(prompt, callbacks, initialMessages);
        } else {
          // We've exceeded the maximum number of retry attempts
          callbacks.onLlmOutput(
            `Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Please try again later.`
          );
          callbacks.onComplete();
        }
      } else {
        // For other errors, show error and complete processing
        callbacks.onLlmOutput(
          `Fatal error: ${err instanceof Error ? err.message : String(err)}`
        );
        callbacks.onComplete();
      }
    }
  }
}
