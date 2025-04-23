import { setupMessageListeners } from './messageHandler';
import { cleanupOnUnload } from './tabManager';
import { logWithTimestamp } from './utils';

/**
 * Initialize the extension
 */
function initializeExtension(): void {
  logWithTimestamp('BrowserBee 🐝 extension initialized');
  
  // Set up message listeners
  setupMessageListeners();
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Set up event listeners for the extension
 */
function setupEventListeners(): void {
  // Open options page when the extension is first installed
  chrome.runtime.onInstalled.addListener((details) => {
    logWithTimestamp('BrowserBee 🐝 extension installed');
    
    if (details.reason === 'install') {
      chrome.runtime.openOptionsPage();
    }
  });
  
  // Open the side panel when the extension icon is clicked
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  });
  
  // Clean up when the extension is unloaded
  chrome.runtime.onSuspend.addListener(async () => {
    await cleanupOnUnload();
  });
  
  // Try to listen for side panel events if available
  try {
    // @ts-ignore - These events might not be in the type definitions yet
    if (chrome.sidePanel.onShown) {
      // @ts-ignore
      chrome.sidePanel.onShown.addListener(async (info: { tabId?: number }) => {
        logWithTimestamp(`Side panel shown for tab ${info.tabId}`);
        
        if (info.tabId) {
          // Get the window ID for this tab
          try {
            const tab = await chrome.tabs.get(info.tabId);
            const windowId = tab.windowId;
            logWithTimestamp(`Side panel shown for tab ${info.tabId} in window ${windowId}`);
            
            // Send a message to initialize the tab
            chrome.runtime.sendMessage({ 
              action: 'initializeTab', 
              tabId: info.tabId,
              windowId: windowId
            });
          } catch (error) {
            logWithTimestamp(`Error getting window ID for tab ${info.tabId}: ${String(error)}`, 'error');
            
            // Fall back to initializing without window ID
            chrome.runtime.sendMessage({ 
              action: 'initializeTab', 
              tabId: info.tabId
            });
          }
        }
      });
    }

    // @ts-ignore
    if (chrome.sidePanel.onHidden) {
      // @ts-ignore
      chrome.sidePanel.onHidden.addListener((info: { tabId?: number }) => {
        logWithTimestamp(`Side panel hidden for tab ${info.tabId}`);
        // We don't need to clean up here, but we could if needed
      });
    }
  } catch (error) {
    logWithTimestamp("Side panel events not available: " + String(error), 'warn');
    logWithTimestamp("Using fallback approach for initialization");
  }
}

// Initialize the extension
initializeExtension();

// Export for use in other modules
export default {
  initializeExtension,
  setupEventListeners
};
