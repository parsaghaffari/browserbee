import Anthropic from "@anthropic-ai/sdk";
import { createBrowserAgent, executePromptWithFallback, BrowserAgent } from "../agent/agent";
import { ExecutePromptCallbacks } from "./types";
import { sendUIMessage, logWithTimestamp, handleError } from "./utils";
import { getCurrentTabId, getTabState, setTabState } from "./tabManager";
import { 
  resetStreamingState, 
  addToStreamingBuffer, 
  getStreamingBuffer, 
  setStreamingBuffer,
  clearStreamingBuffer, 
  finalizeStreamingSegment, 
  startNewSegment, 
  getCurrentSegmentId, 
  incrementSegmentId,
  signalStreamingComplete
} from "./streamingManager";

// Message histories for conversation context (one per tab)
const messageHistories = new Map<number, Anthropic.MessageParam[]>();

/**
 * Clear message history for a specific tab
 * @param tabId The tab ID to clear history for
 */
export function clearMessageHistory(tabId?: number): void {
  if (tabId) {
    // Clear message history for a specific tab
    messageHistories.set(tabId, []);
    logWithTimestamp(`Message history cleared for tab ${tabId}`);
  } else if (getCurrentTabId()) {
    // Clear message history for the current tab
    messageHistories.set(getCurrentTabId()!, []);
    logWithTimestamp(`Message history cleared for current tab ${getCurrentTabId()}`);
  } else {
    // Clear all message histories if no tab ID is specified
    messageHistories.clear();
    logWithTimestamp("All message histories cleared");
  }
}

/**
 * Get message history for a specific tab
 * @param tabId The tab ID to get history for
 * @returns The message history for the tab
 */
export function getMessageHistory(tabId: number): Anthropic.MessageParam[] {
  if (!messageHistories.has(tabId)) {
    messageHistories.set(tabId, []);
  }
  return messageHistories.get(tabId)!;
}

/**
 * Initialize the agent if we have a page and API key
 * @param tabId The tab ID to initialize the agent for
 * @returns Promise resolving to true if initialization was successful, false otherwise
 */
export async function initializeAgent(tabId: number): Promise<boolean> {
  const tabState = getTabState(tabId);
  
  if (tabState?.page && !tabState.agent) {
    try {
      const { anthropicApiKey } = await chrome.storage.sync.get(['anthropicApiKey']);
      if (anthropicApiKey) {
        logWithTimestamp('Creating LLM agent...');
        const agent = await createBrowserAgent(tabState.page, anthropicApiKey);
        
        // Update the tab state with the agent
        setTabState(tabId, { ...tabState, agent });
        
        logWithTimestamp('LLM agent created successfully');
        return true;
      } else {
        logWithTimestamp('No API key found, skipping agent initialization', 'warn');
        return false;
      }
    } catch (agentError) {
      handleError(agentError, 'creating agent');
      return false;
    }
  }
  
  return !!tabState?.agent;
}

/**
 * Cancel the current execution
 * @param tabId The tab ID to cancel execution for
 */
export function cancelExecution(tabId?: number): void {
  // If a tabId is provided, make sure it matches the current tab
  if (tabId && tabId !== getCurrentTabId()) {
    logWithTimestamp(`Ignoring cancel request for tab ${tabId} because current tab is ${getCurrentTabId()}`);
    return;
  }
  
  const currentTabId = getCurrentTabId();
  if (!currentTabId) return;
  
  const tabState = getTabState(currentTabId);
  if (tabState?.agent) {
    tabState.agent.cancel();
    sendUIMessage('updateOutput', {
      type: 'system',
      content: 'Cancelling execution...'
    }, currentTabId);
    
    // Immediately notify UI that processing is complete
    sendUIMessage('processingComplete', null, currentTabId);
  }
}

/**
 * Execute a prompt using the LLM agent
 * @param prompt The prompt to execute
 * @param tabId Optional tab ID to execute the prompt for
 */
export async function executePrompt(prompt: string, tabId?: number): Promise<void> {
  try {
    // Get the API key from storage
    const { anthropicApiKey } = await chrome.storage.sync.get(['anthropicApiKey']);
    
    if (!anthropicApiKey) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Error: API key not found. Please set your Anthropic API key in the extension options.'
      }, tabId);
      sendUIMessage('processingComplete', null, tabId);
      return;
    }

    // Use the provided tabId if available, otherwise query for the active tab
    let targetTabId = tabId;
    if (!targetTabId) {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      targetTabId = tabs[0]?.id;
    }
    
    if (!targetTabId) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Error: Could not determine which tab to use.'
      }, tabId);
      sendUIMessage('processingComplete', null, tabId);
      return;
    }
    
    logWithTimestamp(`Executing prompt for tab ${targetTabId}: "${prompt}"`);
    
    // Get the tab state
    const tabState = getTabState(targetTabId);
    
    // Check if we need to initialize or reattach
    const needsInitialization = !tabState?.page || !tabState?.agent;
    const connectionBroken = tabState?.page && !(await isConnectionHealthy(tabState.page));
    
    if (needsInitialization || connectionBroken) {
      // If connection is broken, log it
      if (connectionBroken) {
        logWithTimestamp("Connection health check failed, reattaching...", 'warn');
        sendUIMessage('updateOutput', {
          type: 'system',
          content: 'Debug session was closed, reattaching...'
        }, targetTabId);
      } else {
        sendUIMessage('updateOutput', {
          type: 'system',
          content: 'Initializing for tab...'
        }, targetTabId);
      }
      
      // Import the attachToTab function dynamically to avoid circular dependencies
      const { attachToTab } = await import('./tabManager');
      
      // Attach to the tab
      await attachToTab(targetTabId);
      await initializeAgent(targetTabId);
    }

    // Get the updated tab state
    const updatedTabState = getTabState(targetTabId);
    
    // If we still don't have a page or agent, something went wrong
    if (!updatedTabState?.page || !updatedTabState?.agent) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Error: Failed to initialize Playwright or create agent.'
      }, targetTabId);
      sendUIMessage('processingComplete', null, targetTabId);
      return;
    }

    // Add current page context to history if we have a page
    if (updatedTabState.page) {
      try {
        const currentUrl = await updatedTabState.page.url();
        const currentTitle = await updatedTabState.page.title();
        
        // Add a more explicit system message about the current page
        const pageContextMessage = `Current page: ${currentUrl} (${currentTitle}) - Consider this context when executing commands. If asked to summarize, create tables, or analyze options without specific references, assume the request refers to content on this page.`;
        
        sendUIMessage('updateOutput', {
          type: 'system',
          content: pageContextMessage
        }, targetTabId);
        
        // Always add page context to message history, even if it's empty
        const messageHistory = getMessageHistory(targetTabId);
        messageHistory.push({
          role: "user",
          content: `[System: You are currently on ${currentUrl} (${currentTitle}). 
          
If the user's request seems to continue a previous task (like asking to "summarize options" after a search), interpret it in the context of what you've just been doing.

If the request seems to start a new task that requires going to a different website, you should navigate there.

Use your judgment to determine whether the request is meant to be performed on the current page or requires navigation elsewhere.]`
        });
      } catch (error) {
        logWithTimestamp("Could not get current page info: " + String(error), 'warn');
      }
    }
    
    // Execute the prompt
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `Executing prompt: "${prompt}"`
    }, targetTabId);
    
    // Get user preferences (default to streaming enabled)
    const { useStreaming = true } = await chrome.storage.sync.get(['useStreaming']);
    
    // Reset streaming buffer and segment ID
    resetStreamingState();
    
    // Add the new prompt to message history
    const messageHistory = getMessageHistory(targetTabId);
    if (messageHistory.length === 0) {
      // If history is empty, just add the prompt
      messageHistory.push({ role: "user", content: prompt });
    } else {
      // If there's existing history, add a separator and the new prompt
      messageHistory.push({ 
        role: "user", 
        content: `New prompt: ${prompt}` 
      });
    }
    
    // Create callbacks for the agent
    const callbacks: ExecutePromptCallbacks = {
      onLlmChunk: (chunk) => {
        if (useStreaming) {
          // Add chunk to buffer
          addToStreamingBuffer(chunk, targetTabId);
        }
      },
      onLlmOutput: (content) => {
        // For non-streaming mode, send the complete output
        if (!useStreaming) {
          sendUIMessage('updateOutput', {
            type: 'llm',
            content: content
          }, targetTabId);
        } else {
          // For streaming mode, store the final content to ensure it's not lost
          // This will be used in onComplete if needed
          setStreamingBuffer(content);
        }
        
        // Add the assistant's response to message history
        const messageHistory = getMessageHistory(targetTabId);
        messageHistory.push({ role: "assistant", content: content });
        
        // Trim history if it gets too long
        if (messageHistory.length > 20) {
          // Replace the message history with the trimmed version
          messageHistories.set(targetTabId, messageHistory.slice(messageHistory.length - 20));
        }
      },
      onToolOutput: (content) => {
        // Normal handling for tool outputs
        sendUIMessage('updateOutput', {
          type: 'system',
          content: content
        }, targetTabId);
      },
      onToolEnd: (result) => {
        // Check if this is a screenshot result by trying to parse it as JSON
        try {
          const data = JSON.parse(result);
          
          if (data.type === "image" && 
              data.source && 
              data.source.type === "base64" &&
              data.source.media_type === "image/jpeg" &&
              data.source.data) {
            
            // Send special screenshot message to UI
            sendUIMessage('updateScreenshot', {
              type: 'screenshot',
              content: "Screenshot captured",
              imageData: data.source.data,
              mediaType: data.source.media_type
            }, targetTabId);
          }
        } catch (error) {
          // Not JSON or not a screenshot, ignore
        }
      },
      onError: (error) => {
        // For rate limit errors, show a message but don't complete processing
        if (error?.error?.type === 'rate_limit_error') {
          logWithTimestamp("Rate limit error detected: " + JSON.stringify(error), 'warn');
          sendUIMessage('updateOutput', {
            type: 'system',
            content: `⚠️ Rate limit exceeded. Retrying... (${error.error.message})`
          }, targetTabId);
          
          // Explicitly tell the UI to stay in processing mode
          sendUIMessage('rateLimit', {
            isRetrying: true
          }, targetTabId);
        }
      },
      onFallbackStarted: () => {
        // Notify the UI that we're falling back but still processing
        logWithTimestamp("Fallback started, notifying UI to maintain processing state");
        sendUIMessage('fallbackStarted', {
          message: "Switching to fallback mode due to error. Processing continues..."
        }, targetTabId);
      },
      onSegmentComplete: (segment) => {
        if (useStreaming) {
          // Finalize the current streaming segment
          finalizeStreamingSegment(getCurrentSegmentId(), segment, targetTabId);
          
          // Increment segment ID for the next segment
          incrementSegmentId();
        }
      },
      onToolStart: (toolName, toolInput) => {
        if (useStreaming) {
          // Start a new segment for after the tool execution
          startNewSegment(getCurrentSegmentId(), targetTabId);
        }
      },
      onComplete: () => {
        // Finalize the last segment if needed FIRST
        // This ensures the final LLM output is not lost
        if (useStreaming && getStreamingBuffer().trim()) {
          // Check if this segment contains a tool call
          const hasToolCall = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/.test(getStreamingBuffer());
          
          // If it doesn't have a tool call, it's likely the final output
          if (!hasToolCall) {
            finalizeStreamingSegment(getCurrentSegmentId(), getStreamingBuffer(), targetTabId);
          }
        }
        
        // THEN clear any remaining buffer
        clearStreamingBuffer(targetTabId);
        
        // Signal that streaming is complete
        if (useStreaming) {
          signalStreamingComplete(targetTabId);
        }
        sendUIMessage('processingComplete', null, targetTabId);
      }
    };
    
    // Execute the prompt with the agent
    await executePromptWithFallback(
      updatedTabState.agent, 
      prompt, 
      callbacks, 
      getMessageHistory(targetTabId)
    );
  } catch (error) {
    const errorMessage = handleError(error, 'executing prompt');
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `Error: ${errorMessage}`
    }, tabId);
    sendUIMessage('processingComplete', null, tabId);
  }
}

/**
 * Check if the connection to the page is still healthy
 * @param page The page to check
 * @returns True if the connection is healthy, false otherwise
 */
async function isConnectionHealthy(page: any): Promise<boolean> {
  if (!page) return false;
  
  try {
    // Try a simple operation that would fail if the connection is broken
    await page.evaluate(() => true);
    return true;
  } catch (error) {
    logWithTimestamp("Connection health check failed: " + String(error), 'warn');
    return false;
  }
}
