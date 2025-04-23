import { crx } from 'playwright-crx';
import { BrowserAgent, createBrowserAgent, executePrompt, executePromptWithFallback } from './agent/agent';
import Anthropic from "@anthropic-ai/sdk";

// Streaming buffer and regex patterns
let streamingBuffer = '';
const toolCallRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/;
const sentenceEndRegex = /[.!?]\s+/;

// Current streaming segment ID
let currentSegmentId = 0;

// Message histories for conversation context (one per tab)
const messageHistories = new Map<number, Anthropic.MessageParam[]>();

// Track attached tabs
const attachedTabIds = new Set<number>();

// Function to clear message history for a specific tab
function clearMessageHistory(tabId?: number) {
  if (tabId) {
    // Clear message history for a specific tab
    messageHistories.set(tabId, []);
    console.log(`Message history cleared for tab ${tabId}`);
  } else if (currentTabId) {
    // Clear message history for the current tab
    messageHistories.set(currentTabId, []);
    console.log(`Message history cleared for current tab ${currentTabId}`);
  } else {
    // Clear all message histories if no tab ID is specified
    messageHistories.clear();
    console.log("All message histories cleared");
  }
}

// Function to get message history for a specific tab
function getMessageHistory(tabId: number): Anthropic.MessageParam[] {
  if (!messageHistories.has(tabId)) {
    messageHistories.set(tabId, []);
  }
  return messageHistories.get(tabId)!;
}

// Global variables
let crxAppPromise: Promise<Awaited<ReturnType<typeof crx.start>>> | null = null;
let page: any = null;
let agent: BrowserAgent | null = null;
let currentTabId: number | null = null;

// Get or create the shared Playwright instance
async function getCrxApp() {
  if (!crxAppPromise) {
    console.log('Initializing shared Playwright instance');
    crxAppPromise = crx.start().then(app => {
      // Set up event listeners
      app.addListener('attached', ({ tabId }) => {
        attachedTabIds.add(tabId);
        console.log(`Tab ${tabId} attached`);
      });
      
      app.addListener('detached', (tabId) => {
        attachedTabIds.delete(tabId);
        console.log(`Tab ${tabId} detached`);
      });
      
      return app;
    });
  }
  
  return await crxAppPromise;
}

// Simplified attachment function
async function attachToTab(tabId: number): Promise<boolean> {
  try {
    console.log(`Initializing for tab ${tabId}`);
    
    // Get the shared Playwright instance
    const crxApp = await getCrxApp();
    
    // If already attached, do nothing
    if (attachedTabIds.has(tabId)) {
      console.log(`Tab ${tabId} already attached`);
      return true;
    }
    
    console.log(`Attempting to attach to tab ${tabId}`);
    
    try {
      // Simple direct attachment
      page = await crxApp.attach(tabId);
      currentTabId = tabId;
      console.log(`Successfully attached to tab ${tabId}`);
      return true;
    } catch (error) {
      console.error(`Error attaching to tab ${tabId}:`, error);
      
      // Simple fallback - create a new page
      page = await crxApp.newPage();
      console.log(`Created new page instead`);
      
      // Try to navigate to the same URL
      try {
        const tabInfo = await chrome.tabs.get(tabId);
        if (tabInfo.url && !tabInfo.url.startsWith('chrome://')) {
          await page.goto(tabInfo.url);
          console.log(`Navigated new page to ${tabInfo.url}`);
        }
      } catch (navError) {
        console.error(`Error navigating to tab URL:`, navError);
      }
      
      currentTabId = tabId;
      return false;
    }
  } catch (error) {
    console.error(`Unexpected error in attachToTab:`, error);
    return false;
  }
}

// Initialize the agent if we have a page and API key
async function initializeAgent(): Promise<boolean> {
  if (page && !agent) {
    try {
      const { anthropicApiKey } = await chrome.storage.sync.get(['anthropicApiKey']);
      if (anthropicApiKey) {
        console.log('Creating LLM agent...');
        agent = await createBrowserAgent(page, anthropicApiKey);
        console.log('LLM agent created successfully');
        return true;
      } else {
        console.log('No API key found, skipping agent initialization');
        return false;
      }
    } catch (agentError) {
      console.error(`Error creating agent:`, agentError);
      return false;
    }
  }
  return !!agent;
}

// Initialize the extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('BrowserBee 🐝 extension installed');
  
  // Open options page when the extension is first installed
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
  
  // Open the side panel when the extension icon is clicked
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  });
});

// Define interface for side panel events (may not be in current type definitions)
interface SidePanelInfo {
  tabId?: number;
}

// Try to listen for side panel events if available
try {
  // @ts-ignore - These events might not be in the type definitions yet
  if (chrome.sidePanel.onShown) {
    // @ts-ignore
    chrome.sidePanel.onShown.addListener(async (info: SidePanelInfo) => {
      console.log(`Side panel shown for tab ${info.tabId}`);
      if (info.tabId) {
        // Attach to the tab when the side panel is shown
        await attachToTab(info.tabId);
        // Initialize the agent
        await initializeAgent();
      }
    });
  }

  // @ts-ignore
  if (chrome.sidePanel.onHidden) {
    // @ts-ignore
    chrome.sidePanel.onHidden.addListener((info: SidePanelInfo) => {
      console.log(`Side panel hidden for tab ${info.tabId}`);
      // We don't need to clean up here, but we could if needed
    });
  }
} catch (error) {
  console.warn("Side panel events not available:", error);
  
  // Alternative approach: initialize when a prompt is executed
  console.log("Using fallback approach for initialization");
}

// Handle messages from the UI
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'executePrompt') {
    // Use the tabId from the message if available
    if (message.tabId) {
      handlePromptExecution(message.prompt, message.tabId);
    } else {
      handlePromptExecution(message.prompt);
    }
    sendResponse({ success: true });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'cancelExecution') {
    handleCancelExecution(message.tabId);
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'clearHistory') {
    clearMessageHistory(message.tabId);
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'initializeTab') {
    // Initialize the tab as soon as the side panel is opened
    if (message.tabId) {
      // Use setTimeout to make this asynchronous and return the response immediately
      setTimeout(async () => {
        try {
          await attachToTab(message.tabId);
          await initializeAgent();
          console.log(`Tab ${message.tabId} initialized from side panel`);
        } catch (error) {
          console.error(`Error initializing tab from side panel:`, error);
        }
      }, 0);
    }
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// Cancel the current execution
function handleCancelExecution(tabId?: number) {
  // If a tabId is provided, make sure it matches the current tab
  if (tabId && tabId !== currentTabId) {
    console.log(`Ignoring cancel request for tab ${tabId} because current tab is ${currentTabId}`);
    return;
  }
  if (agent) {
    agent.cancel();
    sendUIMessage('updateOutput', {
      type: 'system',
      content: 'Cancelling execution...'
    });
    // Immediately notify UI that processing is complete
    sendUIMessage('processingComplete', null);
  }
}

// Execute a prompt using the LLM agent
async function handlePromptExecution(prompt: string, tabId?: number) {
  try {
    // Get the API key from storage
    const { anthropicApiKey } = await chrome.storage.sync.get(['anthropicApiKey']);
    
    if (!anthropicApiKey) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Error: API key not found. Please set your Anthropic API key in the extension options.'
      });
      sendUIMessage('processingComplete', null);
      return;
    }

    // Use the provided tabId if available, otherwise query for the active tab
    let targetTabId = tabId;
    if (!targetTabId) {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      targetTabId = tabs[0]?.id;
    }
    
    console.log("Target tab ID:", targetTabId);
    console.log("Current tab ID:", currentTabId);
    
    // If we're not already initialized or attached to a different tab, initialize now
    if (!page || (targetTabId && currentTabId !== targetTabId)) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Initializing for tab...'
      });
      
      if (targetTabId) {
        await attachToTab(targetTabId);
        await initializeAgent();
      } else {
        // Fallback if no tab ID is available
        const lastFocusedTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (lastFocusedTabs && lastFocusedTabs[0] && lastFocusedTabs[0].id) {
          await attachToTab(lastFocusedTabs[0].id);
          await initializeAgent();
        } else {
          // Last resort fallback
          sendUIMessage('updateOutput', {
            type: 'system',
            content: 'Error: Could not determine which tab to use.'
          });
          sendUIMessage('processingComplete', null);
          return;
        }
      }
    }

    // If we still don't have a page or agent, something went wrong
    if (!page || !agent) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Error: Failed to initialize Playwright or create agent.'
      });
      sendUIMessage('processingComplete', null);
      return;
    }

    // Add current page context to history if we have a page
    if (page) {
      try {
        const currentUrl = await page.url();
        const currentTitle = await page.title();
        
        // Add a more explicit system message about the current page
        const pageContextMessage = `Current page: ${currentUrl} (${currentTitle}) - Consider this context when executing commands. If asked to summarize, create tables, or analyze options without specific references, assume the request refers to content on this page.`;
        
        sendUIMessage('updateOutput', {
          type: 'system',
          content: pageContextMessage
        });
        
        // Always add page context to message history, even if it's empty
        const messageHistory = getMessageHistory(currentTabId!);
        messageHistory.push({
          role: "user",
          content: `[System: You are currently on ${currentUrl} (${currentTitle}). 
          
If the user's request seems to continue a previous task (like asking to "summarize options" after a search), interpret it in the context of what you've just been doing.

If the request seems to start a new task that requires going to a different website, you should navigate there.

Use your judgment to determine whether the request is meant to be performed on the current page or requires navigation elsewhere.]`
        });
      } catch (error) {
        console.warn("Could not get current page info:", error);
      }
    }
    
    // Execute the prompt
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `Executing prompt: "${prompt}"`
    });
    
    // Get user preferences (default to streaming enabled)
    const { useStreaming = true } = await chrome.storage.sync.get(['useStreaming']);
    
    // Reset streaming buffer and segment ID
    streamingBuffer = '';
    currentSegmentId = 0;
    
    // Add the new prompt to message history
    const messageHistory = getMessageHistory(currentTabId!);
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
    
    await executePromptWithFallback(agent, prompt, {
      onLlmChunk: (chunk) => {
        if (useStreaming) {
          // Add chunk to buffer
          streamingBuffer += chunk;
          
          // Process the buffer
          processStreamingBuffer();
        }
      },
      onLlmOutput: (content) => {
        // For non-streaming mode, send the complete output
        if (!useStreaming) {
          sendUIMessage('updateOutput', {
            type: 'llm',
            content: content
          });
        } else {
          // For streaming mode, store the final content to ensure it's not lost
          // This will be used in onComplete if needed
          streamingBuffer = content;
        }
        
        // Add the assistant's response to message history
        const messageHistory = getMessageHistory(currentTabId!);
        messageHistory.push({ role: "assistant", content: content });
        
        // Trim history if it gets too long
        if (messageHistory.length > 20) {
          // Replace the message history with the trimmed version
          messageHistories.set(currentTabId!, messageHistory.slice(messageHistory.length - 20));
        }
      },
      onToolOutput: (content) => {
        // Check if this is a screenshot result
        if (content.startsWith('🕹️ tool: browser_screenshot')) {
          // Screenshot detection is handled in onToolEnd
        }
        
        // Normal handling for tool outputs
        sendUIMessage('updateOutput', {
          type: 'system',
          content: content
        });
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
            });
          }
        } catch (error) {
          // Not JSON or not a screenshot, ignore
        }
        
        // For streaming mode
        if (useStreaming) {
          // Tool execution is complete, we can continue with the next segment
          // The actual tool output is already sent via onToolOutput
        }
      },
      onError: (error) => {
        // For rate limit errors, show a message but don't complete processing
        if (error?.error?.type === 'rate_limit_error') {
          console.log("Rate limit error detected in background.ts onError handler:", error);
          sendUIMessage('updateOutput', {
            type: 'system',
            content: `⚠️ Rate limit exceeded. Retrying... (${error.error.message})`
          });
          
          // Explicitly tell the UI to stay in processing mode
          sendUIMessage('rateLimit', {
            isRetrying: true
          });
        }
      },
      onFallbackStarted: () => {
        // Notify the UI that we're falling back but still processing
        console.log("Fallback started, notifying UI to maintain processing state");
        sendUIMessage('fallbackStarted', {
          message: "Switching to fallback mode due to error. Processing continues..."
        });
      },
      // New callbacks for the conversational flow
      onSegmentComplete: (segment) => {
        if (useStreaming) {
          // Finalize the current streaming segment
          sendUIMessage('finalizeStreamingSegment', {
            id: currentSegmentId,
            content: segment
          });
          
          // Increment segment ID for the next segment
          currentSegmentId++;
        }
      },
      onToolStart: (toolName, toolInput) => {
        if (useStreaming) {
          // We don't need to send a separate message here since onToolOutput will handle it
          
          // Start a new segment for after the tool execution
          sendUIMessage('startNewSegment', {
            id: currentSegmentId
          });
        }
      },
      onComplete: () => {
        // Finalize the last segment if needed FIRST
        // This ensures the final LLM output is not lost
        if (useStreaming && streamingBuffer.trim()) {
          // Check if this segment contains a tool call
          const hasToolCall = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/.test(streamingBuffer);
          
          // If it doesn't have a tool call, it's likely the final output
          if (!hasToolCall) {
            sendUIMessage('finalizeStreamingSegment', {
              id: currentSegmentId,
              content: streamingBuffer
            });
          }
        }
        
        // THEN clear any remaining buffer
        clearStreamingBuffer();
        
        // Signal that streaming is complete
        if (useStreaming) {
          sendUIMessage('streamingComplete', null);
        }
        sendUIMessage('processingComplete', null);
      }
    }, getMessageHistory(currentTabId!));
  } catch (error) {
    console.error('Error executing prompt:', error);
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
    sendUIMessage('processingComplete', null);
  }
}

// Process the streaming buffer to send complete sentences and tool calls
function processStreamingBuffer() {
  // Check if buffer contains a complete tool call
  const toolCallMatch = streamingBuffer.match(toolCallRegex);
  
  if (toolCallMatch) {
    // When a tool call is detected, we don't send any more streaming chunks
    // The entire segment (including text before the tool call) will be finalized together
    // This prevents duplication of content in the UI
    
    // We keep the entire buffer intact, including the tool call
    // It will be handled by onSegmentComplete after the tool execution
    
    return;
  }
  
  // If no complete tool call, check for complete sentences
  const sentenceMatch = streamingBuffer.match(sentenceEndRegex);
  
  if (sentenceMatch) {
    const lastSentenceEnd = streamingBuffer.lastIndexOf(sentenceMatch[0]) + sentenceMatch[0].length;
    
    // Send complete sentences
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: streamingBuffer.substring(0, lastSentenceEnd)
    });
    
    // Keep remainder in buffer
    streamingBuffer = streamingBuffer.substring(lastSentenceEnd);
  } else if (streamingBuffer.length > 100) {
    // If buffer is getting long without sentence breaks, send it anyway
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: streamingBuffer
    });
    streamingBuffer = '';
  }
  // Otherwise keep accumulating in buffer
}

// Clear any remaining content in the streaming buffer
function clearStreamingBuffer() {
  if (streamingBuffer.length > 0) {
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: streamingBuffer
    });
    streamingBuffer = '';
  }
}

// Send a message to the UI
function sendUIMessage(action: string, content: any) {
  // Include the current tab ID in the message if available
  if (currentTabId) {
    chrome.runtime.sendMessage({ action, content, tabId: currentTabId });
  } else {
    chrome.runtime.sendMessage({ action, content });
  }
}

// Clean up when the extension is unloaded
chrome.runtime.onSuspend.addListener(async () => {
  const crxApp = await getCrxApp().catch(() => null);
  if (crxApp) {
    await crxApp.close();
    crxAppPromise = null;
    page = null;
    agent = null;
    currentTabId = null;
    attachedTabIds.clear();
  }
});
