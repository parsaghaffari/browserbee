import Anthropic from "@anthropic-ai/sdk";
import type { Page } from "playwright-crx/test";
import {
  browserNavigate,
  browserClick,
  browserType,
  browserGetTitle,
  browserWaitForNavigation,
  browserScreenshot,
  browserAccessibleTree,
  browserQuery,
  browserReadText,
  browserSnapshotDom,
  browserMoveMouse,
  browserClickXY,
  browserDrag,
  browserKeyboardType,
  browserPressKey,
  browserNavigateBack,
  browserNavigateForward,
  browserTabList,
  browserTabNew,
  browserTabSelect,
  browserTabClose,
  browserHandleDialog  
} from "./tools";

/**──── Quick‑win guardrails ───────────────────────────────────────────────────*/
const MAX_STEPS = 50;            // prevent infinite loops
const MAX_CONTEXT_TOKENS = 12_000; // rough cap for messages sent to the LLM

/** Very cheap “char/4” token estimator. */
const approxTokens = (text: string) => Math.ceil(text.length / 4);
const contextTokenCount = (msgs: Anthropic.MessageParam[]) =>
  msgs.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return sum + approxTokens(content);
  }, 0);

/** Trim oldest messages until we're under the limit. */
function trimHistory(
  msgs: Anthropic.MessageParam[],
  maxTokens = MAX_CONTEXT_TOKENS
) {
  while (contextTokenCount(msgs) > maxTokens && msgs.length > 2) {
    msgs.splice(0, 2); // drop oldest user + assistant pair
  }
  return msgs;
}

// ──────────────────────────────────────────────────────────────────────────────

export class BrowserAgent {
  private anthropic: Anthropic;
  private tools: any[];
  private isCancelled: boolean = false;

  constructor(page: Page, apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    this.tools = [
      browserNavigate(page),
      browserClick(page),
      browserType(page),
      browserGetTitle(page),
      browserWaitForNavigation(page),
      browserScreenshot(page),
      browserAccessibleTree(page),
      browserQuery(page),
      browserReadText(page),
      browserSnapshotDom(page),
      browserMoveMouse(page),
      browserClickXY(page),
      browserDrag(page),
      browserPressKey(page),
      browserKeyboardType(page),
      browserNavigateBack(page),
      browserNavigateForward(page),
      browserTabList(page),
      browserTabNew(page),
      browserTabSelect(page),
      browserTabClose(page),
      browserHandleDialog(page)
    ];
  }

  /** Build the fixed system prompt each call. */
  private getSystemPrompt(): string {
    const toolDescriptions = this.tools
      .map((t) => `${t.name}: ${t.description}`)
      .join("\n\n");

    return `You are a browser‑automation assistant.

You have access to these tools:

${toolDescriptions}

To use a tool, reply exactly as:
<tool>tool_name</tool>
<input>arguments here</input>

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

  /** Main public runner with fallback support. */
  async executePromptWithFallback(
    prompt: string,
    callbacks: {
      onLlmChunk?: (s: string) => void;
      onLlmOutput: (s: string) => void;
      onToolOutput: (s: string) => void;
      onComplete: () => void;
    }
  ): Promise<void> {
    const streamingSupported = await this.isStreamingSupported();
    
    if (streamingSupported && callbacks.onLlmChunk) {
      try {
        await this.executePromptWithStreaming(prompt, callbacks);
      } catch (error) {
        console.warn("Streaming failed, falling back to non-streaming mode:", error);
        await this.executePrompt(prompt, callbacks);
      }
    } else {
      // Directly use non-streaming mode
      await this.executePrompt(prompt, callbacks);
    }
  }

  /** Streaming version of the prompt execution */
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
    }
  ): Promise<void> {
    // Reset cancel flag at the start of execution
    this.resetCancel();
    try {
      let messages: Anthropic.MessageParam[] = [
        { role: "user", content: prompt },
      ];

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
            max_tokens: 1024,
            messages,
          });

          for await (const chunk of stream) {
            if (this.isCancelled) break;
            
            // Handle content block deltas (text chunks)
            if (chunk.type === 'content_block_delta' && 
                chunk.delta.type === 'text_delta') {
              const textChunk = chunk.delta.text;
              accumulatedText += textChunk;
              streamBuffer += textChunk;
              
              // Check if we've detected a complete tool call in the buffer
              const toolCallMatch = streamBuffer.match(/<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/);
              
              if (toolCallMatch && !toolCallDetected) {
                toolCallDetected = true;
                
                // Extract the tool call
                const [fullMatch, toolName, toolInput] = toolCallMatch;
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
            /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/
          );

          if (!toolMatch) {
            // no tool tag ⇒ task complete
            done = true;
            break;
          }

          const [, toolNameRaw, toolInputRaw] = toolMatch;
          const toolName = toolNameRaw.trim();
          const toolInput = toolInputRaw.trim();
          const tool = this.tools.find((t) => t.name === toolName);

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
          const result = await tool.func(toolInput);
          
          // Signal that tool execution is complete
          if (callbacks.onToolEnd) {
            callbacks.onToolEnd(result);
          }

          // Check for cancellation after tool execution
          if (this.isCancelled) break;

          // ── 4. Record turn & prune history ───────────────────────────────────
          messages.push(
            { role: "assistant", content: accumulatedText },
            { role: "user", content: `Tool result: ${result}` }
          );
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
    } catch (err) {
      callbacks.onLlmOutput(
        `Fatal error: ${err instanceof Error ? err.message : String(err)}`
      );
      callbacks.onComplete();
      throw err; // Re-throw to trigger fallback
    }
  }

  /** Original non-streaming implementation */
  async executePrompt(
    prompt: string,
    callbacks: {
      onLlmChunk?: (s: string) => void;
      onLlmOutput: (s: string) => void;
      onToolOutput: (s: string) => void;
      onComplete: () => void;
    }
  ): Promise<void> {
    // Reset cancel flag at the start of execution
    this.resetCancel();
    try {
      let messages: Anthropic.MessageParam[] = [
        { role: "user", content: prompt },
      ];

      let done = false;
      let step = 0;

      while (!done && step++ < MAX_STEPS && !this.isCancelled) {
        try {
          // Check for cancellation before each major step
          if (this.isCancelled) break;

          // ── 1. Call LLM ───────────────────────────────────────────────────────
          const responsePromise = this.anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            system: this.getSystemPrompt(),
            temperature: 0,
            max_tokens: 1024,
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
            /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/
          );

          if (!toolMatch) {
            // no tool tag ⇒ task complete
            done = true;
            break;
          }

          const [, toolNameRaw, toolInputRaw] = toolMatch;
          const toolName = toolNameRaw.trim();
          const toolInput = toolInputRaw.trim();
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
          const result = await tool.func(toolInput);

          // Check for cancellation after tool execution
          if (this.isCancelled) break;

          // ── 4. Record turn & prune history ───────────────────────────────────
          messages.push(
            { role: "assistant", content: assistantText },
            { role: "user", content: `Tool result: ${result}` }
          );
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
    } catch (err) {
      callbacks.onLlmOutput(
        `Fatal error: ${err instanceof Error ? err.message : String(err)}`
      );
      callbacks.onComplete();
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
  }
): Promise<void> {
  return agent.executePrompt(prompt, callbacks);
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
  }
): Promise<void> {
  return agent.executePromptWithFallback(prompt, callbacks);
}
