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
    sendUIMessage('updateLlmOutput', '\nCancelling execution...\n');
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
      sendUIMessage('updateLlmOutput', 'Error: API key not found. Please set your Anthropic API key in the extension options.');
      sendUIMessage('processingComplete', null);
      return;
    }

    // Initialize Playwright if not already initialized
    if (!crxApp) {
      sendUIMessage('updateLlmOutput', 'Initializing Playwright...\n');
      crxApp = await crx.start();
    }

    // Get the active tab or create a new page
    if (!page) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = tabs[0]?.id;
      
      if (activeTabId) {
        try {
          page = await crxApp.attach(activeTabId);
          sendUIMessage('updateLlmOutput', 'Attached to active tab.\n');
        } catch (error) {
          page = await crxApp.newPage();
          sendUIMessage('updateLlmOutput', 'Created new page.\n');
        }
      } else {
        page = await crxApp.newPage();
        sendUIMessage('updateLlmOutput', 'Created new page.\n');
      }
    }

    // Create the agent if not already created
    if (!agent) {
      sendUIMessage('updateLlmOutput', 'Creating LLM agent...\n');
      agent = await createBrowserAgent(page, anthropicApiKey);
    }

    // Execute the prompt
    sendUIMessage('updateLlmOutput', `Executing prompt: "${prompt}"\n\n`);
    
    await executePrompt(agent, prompt, {
      onLlmOutput: (content) => {
        sendUIMessage('updateLlmOutput', content + '\n');
      },
      onToolOutput: (content) => {
        sendUIMessage('updateLlmOutput', content + '\n\n');
      },
      onComplete: () => {
        sendUIMessage('processingComplete', null);
      }
    });
  } catch (error) {
    console.error('Error executing prompt:', error);
    sendUIMessage('updateLlmOutput', `Error: ${error instanceof Error ? error.message : String(error)}\n`);
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
