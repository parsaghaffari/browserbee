// Import provider-specific types
import Anthropic from "@anthropic-ai/sdk";
import { ProviderType } from "./types";
import { BrowserAgent, createBrowserAgent, executePromptWithFallback, needsReinitialization } from "../agent/AgentCore";
import { contextTokenCount } from "../agent/TokenManager";
import { ScreenshotManager } from "../tracking/screenshotManager";
import { TokenTrackingService } from "../tracking/tokenTrackingService";
import { ExecutionCallbacks } from "../agent/ExecutionEngine";
import { sendUIMessage, logWithTimestamp, handleError } from "./utils";
import { 
  getCurrentTabId, 
  getTabState, 
  setTabState, 
  getWindowForTab, 
  getAgentForWindow, 
  setAgentForWindow,
  getAgentForTab,
  isConnectionHealthy
} from "./tabManager";
import { saveReflectionMemory } from "./reflectionController";
import { ConfigManager } from "./configManager";
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

// Generic message format that works with all providers
interface GenericMessage {
  role: string;
  content: string | any;
}

// Interface for structured message history
interface MessageHistory {
  provider: ProviderType;
  originalRequest: GenericMessage | null;
  conversationHistory: GenericMessage[];
}

// Define a maximum token budget for conversation history
const MAX_CONVERSATION_TOKENS = 100000; // 100K tokens for conversation history

// Message histories for conversation context (one per tab)
const messageHistories = new Map<number, MessageHistory>();

/**
 * Get the current provider type from config
 */
async function getCurrentProvider(): Promise<ProviderType> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.getProviderConfig();
  return config.provider;
}

/**
 * Clear message history for a specific tab
 * @param tabId The tab ID to clear history for
 */
export async function clearMessageHistory(tabId?: number): Promise<void> {
  // Get the screenshot manager
  const screenshotManager = ScreenshotManager.getInstance();
  
  // Get current provider
  const provider = await getCurrentProvider();
  
  if (tabId) {
    // Clear message history for a specific tab
    messageHistories.set(tabId, { provider, originalRequest: null, conversationHistory: [] });
    // Clear screenshots
    screenshotManager.clear();
    logWithTimestamp(`Message history and screenshots cleared for tab ${tabId}`);
  } else if (getCurrentTabId()) {
    // Clear message history for the current tab
    messageHistories.set(getCurrentTabId()!, { provider, originalRequest: null, conversationHistory: [] });
    // Clear screenshots
    screenshotManager.clear();
    logWithTimestamp(`Message history and screenshots cleared for current tab ${getCurrentTabId()}`);
  } else {
    // Clear all message histories if no tab ID is specified
    messageHistories.clear();
    // Clear screenshots
    screenshotManager.clear();
    logWithTimestamp("All message histories and screenshots cleared");
  }
}

/**
 * Get message history for a specific tab
 * @param tabId The tab ID to get history for
 * @returns The combined message history for the tab (original request + conversation)
 */
export async function getMessageHistory(tabId: number): Promise<Anthropic.MessageParam[]> {
  // Get current provider
  const provider = await getCurrentProvider();
  
  if (!messageHistories.has(tabId)) {
    messageHistories.set(tabId, { provider, originalRequest: null, conversationHistory: [] });
  }
  
  const history = messageHistories.get(tabId)!;
  
  // Update provider if it has changed
  if (history.provider !== provider) {
    history.provider = provider;
    messageHistories.set(tabId, history);
  }
  
  // Convert generic messages to provider-specific format
  const convertedMessages = convertMessagesToProviderFormat(
    history.originalRequest ? [history.originalRequest, ...history.conversationHistory] : history.conversationHistory,
    provider
  );
  
  return convertedMessages;
}

/**
 * Convert generic messages to provider-specific format
 * @param messages The generic messages to convert
 * @param provider The provider to convert to
 * @returns The provider-specific messages
 */
function convertMessagesToProviderFormat(messages: GenericMessage[], provider: ProviderType): Anthropic.MessageParam[] {
  switch (provider) {
    case 'anthropic':
      // Convert to Anthropic format
      return messages.map(msg => {
        // Ensure role is either "user" or "assistant" for Anthropic
        const role = msg.role === "user" || msg.role === "assistant" 
          ? msg.role as "user" | "assistant"
          : "user"; // Default to user for any other role
        
        return {
          role,
          content: msg.content
        };
      });
      
    case 'openai':
      // Convert to OpenAI format (which is compatible with Anthropic's format for our purposes)
      return messages.map(msg => {
        // Map roles: system -> user, user -> user, assistant -> assistant
        const role = msg.role === "assistant" ? "assistant" : "user";
        
        return {
          role,
          content: msg.content
        };
      });
      
    case 'gemini':
      // Convert to Gemini format (which is compatible with Anthropic's format for our purposes)
      return messages.map(msg => {
        // Map roles: system -> user, user -> user, assistant -> assistant
        const role = msg.role === "assistant" ? "assistant" : "user";
        
        return {
          role,
          content: msg.content
        };
      });
      
    default:
      // Default to Anthropic format
      return messages.map(msg => {
        const role = msg.role === "user" || msg.role === "assistant" 
          ? msg.role as "user" | "assistant"
          : "user";
        
        return {
          role,
          content: msg.content
        };
      });
  }
}

/**
 * Get the structured message history object for a specific tab
 * @param tabId The tab ID to get history for
 * @returns The structured message history object
 */
export async function getStructuredMessageHistory(tabId: number): Promise<MessageHistory> {
  // Get current provider
  const provider = await getCurrentProvider();
  
  if (!messageHistories.has(tabId)) {
    messageHistories.set(tabId, { provider, originalRequest: null, conversationHistory: [] });
  }
  
  const history = messageHistories.get(tabId)!;
  
  // Update provider if it has changed
  if (history.provider !== provider) {
    history.provider = provider;
    messageHistories.set(tabId, history);
  }
  
  return history;
}

/**
 * Set the original request for a specific tab
 * @param tabId The tab ID to set the original request for
 * @param request The original request message
 */
export async function setOriginalRequest(tabId: number, request: Anthropic.MessageParam): Promise<void> {
  const history = await getStructuredMessageHistory(tabId);
  history.originalRequest = request;
  messageHistories.set(tabId, history);
}

/**
 * Add a message to the conversation history for a specific tab
 * @param tabId The tab ID to add the message to
 * @param message The message to add
 */
export async function addToConversationHistory(tabId: number, message: Anthropic.MessageParam): Promise<void> {
  const history = await getStructuredMessageHistory(tabId);
  history.conversationHistory.push(message);
  messageHistories.set(tabId, history);
}

// No replacement - removing the isNewTaskRequest function

/**
 * Initialize the agent if we have a page and API key
 * @param tabId The tab ID to initialize the agent for
 * @param forceReinit Optional flag to force reinitialization
 * @returns Promise resolving to true if initialization was successful, false otherwise
 */
export async function initializeAgent(tabId: number, forceReinit: boolean = false): Promise<boolean> {
  const tabState = getTabState(tabId);
  
  if (!tabState?.page || !tabState.windowId) {
    return false;
  }
  
  const windowId = tabState.windowId;
  
  // Get provider configuration
  const configManager = ConfigManager.getInstance();
  const providerConfig = await configManager.getProviderConfig();
  
  // Update token tracking service with current provider and model
  const tokenTracker = TokenTrackingService.getInstance();
  tokenTracker.updateProviderAndModel(providerConfig.provider, providerConfig.apiModelId || '');
  
  // Check if we need to initialize or reinitialize the agent
  const existingAgent = getAgentForWindow(windowId);
  const needsInit = !existingAgent || forceReinit;
  const needsReinit = existingAgent && await needsReinitialization(existingAgent, providerConfig);
  
  if (needsInit || needsReinit) {
    try {
      if (providerConfig.apiKey) {
        logWithTimestamp(`Creating LLM agent for window ${windowId} with ${providerConfig.provider} provider...`);
        const agent = await createBrowserAgent(tabState.page, providerConfig.apiKey);
        
        // Store the agent by window ID
        setAgentForWindow(windowId, agent);
        
        logWithTimestamp(`LLM agent created successfully for window ${windowId}`);
        return true;
      } else {
        logWithTimestamp('No API key found for the selected provider, skipping agent initialization', 'warn');
        return false;
      }
    } catch (agentError) {
      handleError(agentError, 'creating agent');
      return false;
    }
  }
  
  return !!existingAgent;
}

/**
 * Cancel the current execution
 * @param tabId The tab ID to cancel execution for
 */
export function cancelExecution(tabId?: number): void {
  if (!tabId) {
    // If no tab ID provided, try to cancel the current tab's agent
    const currentTabId = getCurrentTabId();
    if (!currentTabId) return;
    tabId = currentTabId;
  }
  
  // Get the window ID for this tab
  const windowId = getWindowForTab(tabId);
  if (!windowId) {
    logWithTimestamp(`Cannot cancel execution for tab ${tabId}: no window ID found`);
    return;
  }
  
  // Get the agent for this window
  const agent = getAgentForWindow(windowId);
  if (!agent) {
    logWithTimestamp(`Cannot cancel execution for window ${windowId}: no agent found`);
    return;
  }
  
  // Cancel the agent
  agent.cancel();
  
  // Notify UI
  sendUIMessage('updateOutput', {
    type: 'system',
    content: 'Cancelling execution...'
  }, tabId);
  
  // Immediately notify UI that processing is complete
  sendUIMessage('processingComplete', null, tabId);
  
  logWithTimestamp(`Cancelled execution for tab ${tabId} in window ${windowId}`);
}

/**
 * Execute a prompt using the LLM agent
 * @param prompt The prompt to execute
 * @param tabId Optional tab ID to execute the prompt for
 * @param isReflectionPrompt Optional flag to indicate if this is a reflection prompt
 */
export async function executePrompt(prompt: string, tabId?: number, isReflectionPrompt: boolean = false): Promise<void> {
  try {
    // Get provider configuration from ConfigManager
    const configManager = ConfigManager.getInstance();
    const providerConfig = await configManager.getProviderConfig();
    
    if (!providerConfig.apiKey) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: `Error: API key not found for ${providerConfig.provider}. Please set your API key in the extension options.`
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
    const tabWindowId = tabState?.windowId;
    const needsInitialization = !tabState?.page || !tabWindowId || !getAgentForWindow(tabWindowId);
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
      const attachResult = await attachToTab(targetTabId);
      
      // If attachResult is a number, it means a new tab was created
      if (typeof attachResult === 'number') {
        // Update the target tab ID to the new one
        logWithTimestamp(`Tab ${targetTabId} was replaced with new tab ${attachResult}`);
        targetTabId = attachResult;
      }
      
      await initializeAgent(targetTabId);
    }

    // Get the updated tab state
    const updatedTabState = getTabState(targetTabId);
    
    // If we still don't have a page or window ID, something went wrong
    if (!updatedTabState?.page || !updatedTabState?.windowId) {
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
        
        // Set the current page context in the PromptManager
        // This will be included in the system prompt
        const updatedWindowId = updatedTabState.windowId;
        const agent = getAgentForWindow(updatedWindowId);
        if (agent) {
          // Access the PromptManager through the agent
          // This is a bit of a hack since we don't have direct access to the PromptManager
          // We're assuming the agent has a property called promptManager
          const promptManager = (agent as any).promptManager;
          if (promptManager && typeof promptManager.setCurrentPageContext === 'function') {
            promptManager.setCurrentPageContext(currentUrl, currentTitle);
          }
        }
      } catch (error) {
        logWithTimestamp("Could not get current page info: " + String(error), 'warn');
      }
    }
    
    // Execute the prompt
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `Executing prompt: "${prompt}"`
    }, targetTabId);
    
    // Always enable streaming
    const useStreaming = true;
    
    // Reset streaming buffer and segment ID
    resetStreamingState();
    
    // Get the structured message history
    const history = await getStructuredMessageHistory(targetTabId);
    
    // Check if this is the first prompt (no original request yet)
    if (!history.originalRequest) {
      // Store this as the original request without adding any special tag
      await setOriginalRequest(targetTabId, { 
        role: "user", 
        content: prompt 
      });
      
      // Also add it to the conversation history to maintain the flow
      await addToConversationHistory(targetTabId, { 
        role: "user", 
        content: prompt 
      });
      
      logWithTimestamp(`Set original request for tab ${targetTabId}: "${prompt}"`);
    } else {
      // This is a follow-up prompt, add it to conversation history
      await addToConversationHistory(targetTabId, { 
        role: "user", 
        content: prompt 
      });
    }
    
    // Create callbacks for the agent
    const callbacks: ExecutionCallbacks = {
      onLlmChunk: (chunk) => {
        if (useStreaming) {
          // Add chunk to buffer
          addToStreamingBuffer(chunk, targetTabId);
        }
      },
      onLlmOutput: async (content) => {
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
        
        // If this is a reflection prompt, directly save the memory
        if (isReflectionPrompt) {
          // Get the domain from the current page
          try {
            updatedTabState.page.evaluate(() => window.location.href)
              .then((url: string) => {
                const domain = new URL(url).hostname;
                
                // Directly save the memory
                saveReflectionMemory(content, domain, targetTabId);
              })
              .catch((error: any) => {
                logWithTimestamp(`Error getting domain for reflection: ${error instanceof Error ? error.message : String(error)}`, 'error');
              });
          } catch (error) {
            logWithTimestamp(`Error in domain extraction for reflection: ${error instanceof Error ? error.message : String(error)}`, 'error');
          }
        }
        
        try {
          // Add the assistant's response to conversation history
          await addToConversationHistory(targetTabId, { role: "assistant", content: content });
          
          // Trim conversation history if it exceeds the token budget
          const history = await getStructuredMessageHistory(targetTabId);
          
          // Calculate the current token count of the conversation history
          const conversationTokens = contextTokenCount(history.conversationHistory);
          
          // If we're over budget, trim from the oldest messages until we're under budget
          if (conversationTokens > MAX_CONVERSATION_TOKENS) {
            logWithTimestamp(`Conversation history exceeds token budget (${conversationTokens}/${MAX_CONVERSATION_TOKENS}), trimming oldest messages`);
            
            // Remove oldest messages until we're under the token budget
            while (contextTokenCount(history.conversationHistory) > MAX_CONVERSATION_TOKENS && 
                   history.conversationHistory.length > 1) {
              // Remove the oldest message
              history.conversationHistory.shift();
            }
            
            // Update the message history
            messageHistories.set(targetTabId, history);
            
            logWithTimestamp(`Trimmed conversation history to ${history.conversationHistory.length} messages (${contextTokenCount(history.conversationHistory)} tokens)`);
          }
        } catch (error) {
          logWithTimestamp(`Error updating conversation history: ${error instanceof Error ? error.message : String(error)}`, 'error');
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
        // For retryable errors (rate limit or overloaded), show a message but don't complete processing
        if (error?.error?.type === 'rate_limit_error' || error?.error?.type === 'overloaded_error') {
          const errorType = error?.error?.type === 'overloaded_error' ? 'Anthropic servers overloaded' : 'Rate limit exceeded';
          logWithTimestamp(`${errorType} error detected: ${JSON.stringify(error)}`, 'warn');
          
          sendUIMessage('updateOutput', {
            type: 'system',
            content: `⚠️ ${errorType}. Retrying... (${error.error.message})`
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
    
    // Get the agent for this window
    const updatedWindowId = updatedTabState.windowId;
    if (!updatedWindowId) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: `Error: No window ID found for tab ${targetTabId}.`
      }, targetTabId);
      sendUIMessage('processingComplete', null, targetTabId);
      return;
    }
    
    const agent = getAgentForWindow(updatedWindowId);
    
    if (!agent) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: `Error: No agent found for window ${updatedWindowId}.`
      }, targetTabId);
      sendUIMessage('processingComplete', null, targetTabId);
      return;
    }
    
    // Execute the prompt with the agent
    const messageHistory = await getMessageHistory(targetTabId);
    await executePromptWithFallback(
      agent, 
      prompt, 
      callbacks, 
      messageHistory
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
