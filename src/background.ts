import { crx } from 'playwright-crx';
import { BrowserAgent, createBrowserAgent, executePrompt } from './agent/agent';

// Global variables
let crxApp: Awaited<ReturnType<typeof crx.start>> | null = null;
let page: any = null;
let agent: BrowserAgent | null = null;

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Playwright LLM extension installed');
  
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
    
    await executePrompt(agent, prompt, {
      onLlmOutput: (content) => {
        sendUIMessage('updateOutput', {
          type: 'llm',
          content: content
        });
      },
      onToolOutput: (content) => {
        sendUIMessage('updateOutput', {
          type: 'system',
          content: content
        });
      },
      onComplete: () => {
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
