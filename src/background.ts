import { crx } from 'playwright-crx';
import { BrowserAgent, createBrowserAgent, executePrompt, executePromptWithFallback } from './agent/agent';

// Streaming buffer and regex patterns
let streamingBuffer = '';
const toolCallRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/;
const sentenceEndRegex = /[.!?]\s+/;

// Current streaming segment ID
let currentSegmentId = 0;

// Global variables
let crxApp: Awaited<ReturnType<typeof crx.start>> | null = null;
let page: any = null;
let agent: BrowserAgent | null = null;

// Initialize the extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Playwright LLM extension installed');
  
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

// Handle messages from the UI
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'executePrompt') {
    handlePromptExecution(message.prompt);
    sendResponse({ success: true });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'cancelExecution') {
    handleCancelExecution();
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// Cancel the current execution
function handleCancelExecution() {
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
async function handlePromptExecution(prompt: string) {
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

    // Initialize Playwright if not already initialized
    if (!crxApp) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Initializing Playwright...'
      });
      crxApp = await crx.start();
    }

    // Get the active tab or create a new page
    if (!page) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = tabs[0]?.id;
      
      if (activeTabId) {
        try {
          page = await crxApp.attach(activeTabId);
          sendUIMessage('updateOutput', {
            type: 'system',
            content: 'Attached to active tab.'
          });
        } catch (error) {
          page = await crxApp.newPage();
          sendUIMessage('updateOutput', {
            type: 'system',
            content: 'Created new page.'
          });
        }
      } else {
        page = await crxApp.newPage();
        sendUIMessage('updateOutput', {
          type: 'system',
          content: 'Created new page.'
        });
      }
    }

    // Create the agent if not already created
    if (!agent) {
      sendUIMessage('updateOutput', {
        type: 'system',
        content: 'Creating LLM agent...'
      });
      agent = await createBrowserAgent(page, anthropicApiKey);
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
      },
      onToolOutput: (content) => {
        sendUIMessage('updateOutput', {
          type: 'system',
          content: content
        });
      },
      onError: (error) => {
        // For rate limit errors, show a message but don't complete processing
        if (error?.error?.type === 'rate_limit_error') {
          sendUIMessage('updateOutput', {
            type: 'system',
            content: `⚠️ Rate limit exceeded. Retrying... (${error.error.message})`
          });
        }
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
      onToolEnd: (result) => {
        if (useStreaming) {
          // Tool execution is complete, we can continue with the next segment
          // The actual tool output is already sent via onToolOutput
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
    });
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
    // Extract the complete tool call
    const [fullMatch] = toolCallMatch;
    const matchIndex = streamingBuffer.indexOf(fullMatch);
    const endIndex = matchIndex + fullMatch.length;
    
    // Send text before the tool call
    if (matchIndex > 0) {
      sendUIMessage('updateStreamingChunk', {
        type: 'llm',
        content: streamingBuffer.substring(0, matchIndex)
      });
    }
    
    // Send the complete tool call
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: fullMatch
    });
    
    // Update buffer to contain only text after the tool call
    streamingBuffer = streamingBuffer.substring(endIndex);
    
    // Process remaining buffer recursively
    if (streamingBuffer.length > 0) {
      processStreamingBuffer();
    }
    
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
  chrome.runtime.sendMessage({ action, content });
}

// Clean up when the extension is unloaded
chrome.runtime.onSuspend.addListener(async () => {
  if (crxApp) {
    await crxApp.close();
    crxApp = null;
    page = null;
    agent = null;
  }
});
