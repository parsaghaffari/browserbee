import Anthropic from "@anthropic-ai/sdk";
import type { Page } from "playwright-crx/test";
import { getAllTools } from "./tools/index";
import { TokenTrackingService } from "../tracking/tokenTrackingService";
import { ScreenshotManager } from "../tracking/screenshotManager";
import { requestApproval } from "./approvalManager";
import { ToolExecutionContext } from "./tools/types";

/**──── Quick‑win guardrails ───────────────────────────────────────────────────*/
const MAX_STEPS = 50;            // prevent infinite loops
const MAX_CONTEXT_TOKENS = 12_000; // rough cap for messages sent to the LLM
const MAX_OUTPUT_TOKENS = 1024;  // max tokens for LLM response

/** Very cheap "char/4" token estimator. */
const approxTokens = (text: string) => Math.ceil(text.length / 4);
export const contextTokenCount = (msgs: Anthropic.MessageParam[]) =>
  msgs.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return sum + approxTokens(content);
  }, 0);

/**
 * Intelligently trim message history while preserving all user messages.
 * 
 * This function prioritizes keeping user messages (especially the original request)
 * while trimming assistant responses when needed to stay under the token limit.
 */
function trimHistory(
  msgs: Anthropic.MessageParam[],
  maxTokens = MAX_CONTEXT_TOKENS
) {
  // If we're under the limit or have very few messages, no need to trim
  if (contextTokenCount(msgs) <= maxTokens || msgs.length <= 2) {
    return msgs;
  }
  
  // Track which indices we want to keep
  const indicesToKeep = new Set<number>();
  
  // Always keep the first message (original request)
  if (msgs.length > 0) {
    indicesToKeep.add(0);
  }
  
  // First pass: mark all user messages to keep
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i].role === "user") {
      indicesToKeep.add(i);
    }
  }
  
  // Calculate token count for all messages we're definitely keeping
  const keptMessages = Array.from(indicesToKeep).map(i => msgs[i]);
  const keptTokenCount = contextTokenCount(keptMessages);
  let remainingTokens = maxTokens - keptTokenCount;
  
  // Second pass: add assistant messages from newest to oldest until we hit the token limit
  const assistantIndices: number[] = [];
  for (let i = msgs.length - 1; i >= 1; i--) {
    if (msgs[i].role === "assistant" && !indicesToKeep.has(i)) {
      assistantIndices.push(i);
    }
  }
  
  // Try to add each assistant message if it fits in our token budget
  for (const idx of assistantIndices) {
    const msg = msgs[idx];
    const msgTokens = contextTokenCount([msg]);
    
    if (msgTokens <= remainingTokens) {
      indicesToKeep.add(idx);
      remainingTokens -= msgTokens;
    }
  }
  
  // Build the final trimmed array in the original order
  const trimmedMsgs: Anthropic.MessageParam[] = [];
  for (let i = 0; i < msgs.length; i++) {
    if (indicesToKeep.has(i)) {
      trimmedMsgs.push(msgs[i]);
    }
  }
  
  return trimmedMsgs;
}

// ──────────────────────────────────────────────────────────────────────────────

export class BrowserAgent {
  private anthropic: Anthropic;
  private tools: any[];
  private isCancelled: boolean = false;

  private page: Page;
  
  constructor(page: Page, apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    
    this.page = page;

    // Get all tools from the tools module
    const allTools = getAllTools(page);
    
    // Wrap non-tab tools with health check
    this.tools = allTools.map(tool => {
      // Tab tools don't need health check as they operate at browser context level
      if (this.isTabTool(tool.name)) {
        return tool;
      }
      return this.wrapToolWithHealthCheck(tool);
    });
  }
  
  // Flag to indicate if we should use tab tools exclusively
  private useTabToolsOnly: boolean = false;
  
  // Check if the connection to the page is still healthy
  private async isConnectionHealthy(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // Try a simple operation that would fail if the connection is broken
      await this.page.evaluate(() => true);
      this.useTabToolsOnly = false; // Connection is healthy, use all tools
      return true;
    } catch (error) {
      console.log("Agent connection health check failed:", error);
      this.useTabToolsOnly = true; // Connection is broken, use tab tools only
      return false;
    }
  }
  
  // Check if a tool is a tab tool
  private isTabTool(toolName: string): boolean {
    return toolName.startsWith('browser_tab_');
  }
  
  // Wrap a tool's function with a health check
  private wrapToolWithHealthCheck(tool: any): any {
    const originalFunc = tool.func;
    const toolName = tool.name;
    const isTabTool = this.isTabTool(toolName);
    
    // Create a new function that checks health before executing
    tool.func = async (input: string) => {
      try {
        // For non-tab tools, check connection health
        if (!isTabTool && !await this.isConnectionHealthy()) {
          // If this is a navigation tool, suggest using tab tools instead
          if (toolName === 'browser_navigate') {
            return `Error: Debug session was closed. Please use browser_tab_new instead with the URL as input. Example: browser_tab_new | ${input}`;
          }
          
          // For screenshot or other observation tools, suggest creating a new tab
          if (toolName.includes('screenshot') || toolName.includes('read') || toolName.includes('title')) {
            return `Error: Debug session was closed. Please create a new tab first using browser_tab_new, then select it with browser_tab_select, and try again.`;
          }
          
          // Generic message for other tools
          return "Error: Debug session was closed. Please use tab tools (browser_tab_new, browser_tab_select, etc.) to create and work with a new tab.";
        }
        
        // If connection is healthy or this is a tab tool, execute the original function
        return await originalFunc(input);
      } catch (error) {
        // If this is a tab tool, provide a more helpful error message
        if (isTabTool) {
          return `Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}. Tab tools should still work even with a closed debug session. Try browser_tab_new to create a fresh tab.`;
        }
        
        // For other tools, suggest using tab tools if the error might be related to a closed session
        const errorStr = String(error);
        if (errorStr.includes('closed') || errorStr.includes('detached') || errorStr.includes('destroyed')) {
          this.useTabToolsOnly = true; // Set the flag to use tab tools only
          return `Error: Debug session appears to be closed. Please use tab tools (browser_tab_new, browser_tab_select, etc.) to create and work with a new tab.`;
        }
        
        return `Error executing tool: ${error instanceof Error ? error.message : String(error)}`;
      }
    };
    
    return tool;
  }

  /** Build the fixed system prompt each call. */
  private getSystemPrompt(): string {
    const toolDescriptions = this.tools
      .map((t) => `${t.name}: ${t.description}`)
      .join("\n\n");

    return `You are a browser‑automation assistant.

You have access to these tools:

${toolDescriptions}

VERIFICATION-FIRST WORKFLOW:
1. When navigating to a new page, ALWAYS use observation tools first (browser_read_text, screenshot, DOM snapshot) before taking any action
2. After navigation, verify the current state of the page before making assumptions about login status or content
3. Use browser_read_text, browser_snapshot_dom, or browser_screenshot immediately after navigation to understand the page context
4. Explicitly describe what you observe before interpreting or taking action
5. Follow this sequence: navigate → observe → analyze → act

OBSERVATION GUIDELINES:
1. Always describe what you actually see in screenshots or DOM snapshots, not what you expect to see
2. When you don't see something you expected (like login forms or messages), explicitly state this
3. Use specific, concrete descriptions rather than assumptions
4. If you're uncertain about what you're seeing, acknowledge the uncertainty
5. For critical observations (login status, message content), double-check with a second observation tool

IMPORTANT CONTEXT RULES:
1. Always consider the current page you're on when deciding how to execute commands
2. When asked to search while on a website with search functionality, use that site's search box
3. Only navigate away from the current site when:
   - The user explicitly asks you to go to another website
   - The current task cannot be completed on the current website
   - The user's request clearly implies a need to go elsewhere
4. If a task can be completed on the current page, prefer to stay on that page
5. Pay attention to the "Current page:" information provided before each prompt
6. Maintain conversation continuity - each new prompt is part of an ongoing session
7. When a user refers to content without being specific (e.g., "summarize the options", "create a table"), assume they're referring to the content currently visible on the page, not to your available tools or capabilities
8. Review the conversation history to understand the context of the current request - if the user just performed a search or viewed specific content, subsequent requests likely refer to those results

TOOL USAGE FORMAT:
To use a tool, you MUST ALWAYS reply with this EXACT format:
<tool>tool_name</tool>
<input>arguments here</input>
<requires_approval>true or false</requires_approval>

IMPORTANT: NEVER output a <tool> tag without its corresponding <input> and <requires_approval> tags. Always complete all 3 tags.

APPROVAL GUIDELINES:
Set <requires_approval>true</requires_approval> for actions that:
1. Make purchases or financial transactions (e.g., clicking "Buy Now", "Add to Cart")
2. Delete or modify important data (e.g., deleting content, changing settings)
3. Send messages or post content visible to others (e.g., social media posts, emails)
4. Submit forms with sensitive information (e.g., login forms, personal details)
5. Perform potentially risky operations (e.g., accepting terms, granting permissions)

If unsure, err on the side of caution and set <requires_approval>true</requires_approval>.

Wait for each tool result before the next step.
Think step‑by‑step; summarise your work when finished.`;
  }

  /** Cancel the current execution */
  cancel(): void {
    this.isCancelled = true;
  }

  /** Reset the cancel flag */
  resetCancel(): void {
    this.isCancelled = false;
  }

  /** Check if streaming is supported in the current environment */
  async isStreamingSupported(): Promise<boolean> {
    try {
      // Check if the browser supports the necessary features for streaming
      const supportsEventSource = typeof EventSource !== 'undefined';
      
      // We could also check for any browser-specific limitations
      const isCompatibleBrowser = !navigator.userAgent.includes('problematic-browser');
      
      return supportsEventSource && isCompatibleBrowser;
    } catch (error) {
      console.warn("Error checking streaming support:", error);
      return false;
    }
  }

  /** Main public runner with fallback support and optional initial messages. */
  async executePromptWithFallback(
    prompt: string,
    callbacks: {
      onLlmChunk?: (s: string) => void;
      onLlmOutput: (s: string) => void;
      onToolOutput: (s: string) => void;
      onComplete: () => void;
      onError?: (error: any) => void;
      onToolStart?: (toolName: string, toolInput: string) => void;
      onToolEnd?: (result: string) => void;
      onSegmentComplete?: (segment: string) => void;
      onFallbackStarted?: () => void; // New callback for fallback notification
    },
    initialMessages: Anthropic.MessageParam[] = []
  ): Promise<void> {
    const streamingSupported = await this.isStreamingSupported();
    
    if (streamingSupported && callbacks.onLlmChunk) {
      try {
        await this.executePromptWithStreaming(prompt, callbacks, initialMessages);
      } catch (error) {
        console.warn("Streaming failed, falling back to non-streaming mode:", error);
        
        // Notify about fallback before switching modes
        if (callbacks.onFallbackStarted) {
          callbacks.onFallbackStarted();
        }
        
        // Check if this is a rate limit error
        // Use type assertion to handle the error object structure
        const errorObj = error as any;
        if (errorObj?.error?.type === 'rate_limit_error') {
          console.log("Rate limit error detected in fallback handler:", errorObj);
          // Ensure the error callback is called even during fallback
          if (callbacks.onError) {
            callbacks.onError(errorObj);
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

  /** Streaming version of the prompt execution with optional initial messages */
  async executePromptWithStreaming(
    prompt: string,
    callbacks: {
      onLlmChunk?: (s: string) => void;
      onLlmOutput: (s: string) => void;
      onToolOutput: (s: string) => void;
      onComplete: () => void;
      onToolStart?: (toolName: string, toolInput: string) => void;
      onToolEnd?: (result: string) => void;
      onSegmentComplete?: (segment: string) => void;
      onError?: (error: any) => void;
      onFallbackStarted?: () => void; // Include the new callback
    },
    initialMessages: Anthropic.MessageParam[] = []
  ): Promise<void> {
    // Reset cancel flag at the start of execution
    this.resetCancel();
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

      while (!done && step++ < MAX_STEPS && !this.isCancelled) {
        try {
          // Check for cancellation before each major step
          if (this.isCancelled) break;

          // ── 1. Call LLM with streaming ───────────────────────────────────────
          let accumulatedText = "";
          let streamBuffer = "";
          let toolCallDetected = false;
          
          const stream = await this.anthropic.messages.stream({
            model: "claude-3-7-sonnet-20250219",
            system: this.getSystemPrompt(),
            temperature: 0,
            max_tokens: MAX_OUTPUT_TOKENS,
            messages,
          });

          // Track token usage
          let inputTokens = 0;
          let outputTokens = 0;
          const tokenTracker = TokenTrackingService.getInstance();
          
          for await (const chunk of stream) {
            if (this.isCancelled) break;
            
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
                chunk.delta.type === 'text_delta') {
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
          if (this.isCancelled) break;

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
          const tool = this.tools.find((t) => t.name === toolName);
          
          // Check if the LLM has marked this as requiring approval
          const requiresApproval = llmRequiresApproval;
          const reason = llmRequiresApproval ? "The AI assistant has determined this action requires your approval." : "";

          if (!tool) {
            messages.push(
              { role: "assistant", content: accumulatedText },
              {
                role: "user",
                content: `Error: tool "${toolName}" not found. Available: ${this.tools
                  .map((t) => t.name)
                  .join(", ")}`,
              }
            );
            continue;
          }

          // Check for cancellation before tool execution
          if (this.isCancelled) break;

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
              const context: ToolExecutionContext = {
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
          if (this.isCancelled) break;

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
          if (this.isCancelled) break;
          throw error; // Re-throw if it wasn't a cancellation
        }
      }

      if (this.isCancelled) {
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
      // Check if this is a rate limit error
      if (err?.error?.type === 'rate_limit_error') {
        console.log("Rate limit error detected in streaming mode:", err);
        // For rate limit errors, notify but don't complete processing
        // This allows the fallback mechanism to retry while maintaining UI state
        if (callbacks.onError) {
          callbacks.onError(err);
        } else {
          callbacks.onLlmOutput(`Rate limit error: ${err.error.message}`);
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

  /** Original non-streaming implementation with optional initial messages */
  async executePrompt(
    prompt: string,
    callbacks: {
      onLlmChunk?: (s: string) => void;
      onLlmOutput: (s: string) => void;
      onToolOutput: (s: string) => void;
      onComplete: () => void;
      onError?: (error: any) => void;
      onToolStart?: (toolName: string, toolInput: string) => void;
      onToolEnd?: (result: string) => void;
      onSegmentComplete?: (segment: string) => void;
      onFallbackStarted?: () => void; // Include the new callback
    },
    initialMessages: Anthropic.MessageParam[] = []
  ): Promise<void> {
    // Reset cancel flag at the start of execution
    this.resetCancel();
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

      while (!done && step++ < MAX_STEPS && !this.isCancelled) {
        try {
          // Check for cancellation before each major step
          if (this.isCancelled) break;

          // ── 1. Call LLM ───────────────────────────────────────────────────────
          // Track token usage
          const tokenTracker = TokenTrackingService.getInstance();
          
          const responsePromise = this.anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            system: this.getSystemPrompt(),
            temperature: 0,
            max_tokens: MAX_OUTPUT_TOKENS,
            messages,
          });

          // Set up a check for cancellation during LLM call
          const checkCancellation = async () => {
            while (!this.isCancelled) {
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
          if (this.isCancelled || !response) {
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
          if (this.isCancelled) break;

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
          const tool = this.tools.find((t) => t.name === toolName);

          if (!tool) {
            messages.push(
              { role: "assistant", content: assistantText },
              {
                role: "user",
                content: `Error: tool "${toolName}" not found. Available: ${this.tools
                  .map((t) => t.name)
                  .join(", ")}`,
              }
            );
            continue;
          }

          // Check for cancellation before tool execution
          if (this.isCancelled) break;

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
              const context: ToolExecutionContext = {
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
          if (this.isCancelled) break;

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
          if (this.isCancelled) break;
          throw error; // Re-throw if it wasn't a cancellation
        }
      }

      if (this.isCancelled) {
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
      // Check if this is a rate limit error
      if (err?.error?.type === 'rate_limit_error') {
        console.log("Rate limit error detected in non-streaming mode:", err);
        // For rate limit errors, notify but don't complete processing
        if (callbacks.onError) {
          callbacks.onError(err);
        } else {
          callbacks.onLlmOutput(`Rate limit error: ${err.error.message}`);
        }
        
        // Since this is already the fallback mode, we need to retry
        // Wait a bit before retrying to avoid hitting rate limits again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Notify that we're retrying
        callbacks.onToolOutput("Retrying after rate limit error...");
        
        // Recursive retry with the same parameters
        return this.executePrompt(prompt, callbacks, initialMessages);
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

// ──────────────────────────────────────────────────────────────────────────────
// Factory helpers
// ──────────────────────────────────────────────────────────────────────────────

export async function createBrowserAgent(
  page: Page,
  apiKey: string
): Promise<BrowserAgent> {
  return new BrowserAgent(page, apiKey);
}

export async function executePrompt(
  agent: BrowserAgent,
  prompt: string,
  callbacks: {
    onLlmChunk?: (s: string) => void;
    onLlmOutput: (s: string) => void;
    onToolOutput: (s: string) => void;
    onComplete: () => void;
  },
  initialMessages: Anthropic.MessageParam[] = []
): Promise<void> {
  return agent.executePrompt(prompt, callbacks, initialMessages);
}

export async function executePromptWithFallback(
  agent: BrowserAgent,
  prompt: string,
  callbacks: {
    onLlmChunk?: (s: string) => void;
    onLlmOutput: (s: string) => void;
    onToolOutput: (s: string) => void;
    onComplete: () => void;
    onToolStart?: (toolName: string, toolInput: string) => void;
    onToolEnd?: (result: string) => void;
    onSegmentComplete?: (segment: string) => void;
    onError?: (error: any) => void;
    onFallbackStarted?: () => void; // Add the new callback to the type definition
  },
  initialMessages: Anthropic.MessageParam[] = []
): Promise<void> {
  return agent.executePromptWithFallback(prompt, callbacks, initialMessages);
}
