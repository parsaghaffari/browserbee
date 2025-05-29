import { MemoryService } from '../tracking/memoryService';
import { setupMessageListeners } from './messageHandler';
import { cleanupOnUnload, setupTabListeners } from './tabManager';
import { logWithTimestamp } from './utils';

/**
 * Initialize the extension
 */
function initializeExtension(): void {
  logWithTimestamp('BrowserBee 🐝 extension initialized');

  // Set up message listeners
  setupMessageListeners();

  // Set up tab listeners
  setupTabListeners();

  // Set up event listeners
  setupEventListeners();

  // Set up command listeners
  setupCommandListeners();
}

/**
 * Set up event listeners for the extension
 */
function setupEventListeners(): void {
  // Listen for changes to Chrome storage
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      // Check if any provider configuration has changed
      const providerConfigChanged = Object.keys(changes).some(key =>
        key === 'provider' ||
        key === 'anthropicApiKey' ||
        key === 'openaiApiKey' ||
        key === 'geminiApiKey' ||
        key === 'ollamaApiKey' ||
        key === 'anthropicBaseUrl' ||
        key === 'openaiBaseUrl' ||
        key === 'geminiBaseUrl' ||
        key === 'ollamaBaseUrl'
      );

      if (providerConfigChanged) {
        // Notify all clients that provider configuration has changed
        chrome.runtime.sendMessage({
          action: 'providerConfigChanged'
        });

        logWithTimestamp('Provider configuration changed, notified clients');
      }
    }
  });

  // Open options page when the extension is first installed
  chrome.runtime.onInstalled.addListener((details) => {
    logWithTimestamp('BrowserBee 🐝 extension installed');

    if (details.reason === 'install') {
      chrome.runtime.openOptionsPage();
    }

    // Initialize the memory database on install or update
    if (details.reason === 'install' || details.reason === 'update') {
      logWithTimestamp('Initializing memory database');
      const memoryService = MemoryService.getInstance();
      memoryService.init().then(async () => {
        logWithTimestamp('Memory database initialized successfully');

        // Import default memories only on fresh install
        if (details.reason === 'install') {
          try {
            logWithTimestamp('Importing default memories for new installation');
            const importedCount = await memoryService.importDefaultMemories();
            if (importedCount > 0) {
              logWithTimestamp(`Successfully imported ${importedCount} default memories`);
            } else {
              logWithTimestamp('No default memories were imported');
            }
          } catch (error) {
            logWithTimestamp(`Error importing default memories: ${error}`, 'error');
          }
        }
      }).catch(error => {
        logWithTimestamp(`Error initializing memory database: ${error}`, 'error');
      });
    }
  });

  // Open the side panel when the extension icon is clicked or Alt+Shift+B is pressed
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      logWithTimestamp(`Opening side panel for tab ${tab.id}`);

      try {
        await chrome.sidePanel.open({ tabId: tab.id });
        logWithTimestamp(`Side panel opened for tab ${tab.id}`);
      } catch (error) {
        logWithTimestamp(`Error opening side panel: ${String(error)}`, 'error');
      }
    } else {
      logWithTimestamp('No tab ID available for action click', 'error');
    }
  });

  // Clean up when the extension is unloaded
  chrome.runtime.onSuspend.addListener(async () => {
    logWithTimestamp('Extension is being suspended, cleaning up resources');
    try {
      await cleanupOnUnload();
      logWithTimestamp('Cleanup completed successfully');

      // Delete the memory database on uninstall/disable
      try {
        logWithTimestamp('Deleting memory database');
        const request = indexedDB.deleteDatabase('browserbee-memories');

        request.onsuccess = () => {
          logWithTimestamp('Memory database deleted successfully');
        };

        request.onerror = (event) => {
          logWithTimestamp(`Error deleting memory database: ${(event.target as IDBRequest).error}`, 'error');
        };
      } catch (error) {
        logWithTimestamp(`Exception deleting memory database: ${error}`, 'error');
      }
    } catch (error) {
      logWithTimestamp(`Error during cleanup: ${String(error)}`, 'error');
    }
  });

  // Additional cleanup on update or uninstall
  chrome.runtime.onUpdateAvailable.addListener(async (details) => {
    logWithTimestamp(`Extension update available: ${details.version}, cleaning up resources`);
    try {
      await cleanupOnUnload();
      logWithTimestamp('Cleanup before update completed successfully');

      // Delete the memory database before update
      try {
        logWithTimestamp('Deleting memory database before update');
        const request = indexedDB.deleteDatabase('browserbee-memories');

        request.onsuccess = () => {
          logWithTimestamp('Memory database deleted successfully before update');
        };

        request.onerror = (event) => {
          logWithTimestamp(`Error deleting memory database before update: ${(event.target as IDBRequest).error}`, 'error');
        };
      } catch (error) {
        logWithTimestamp(`Exception deleting memory database before update: ${error}`, 'error');
      }
    } catch (error) {
      logWithTimestamp(`Error during pre-update cleanup: ${String(error)}`, 'error');
    }
  });

  // Try to listen for side panel events if available
  try {
    // @ts-expect-error - These events might not be in the type definitions yet
    if (chrome.sidePanel.onShown) {
      // @ts-expect-error - These events might not be in the type definitions yet
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

    // @ts-expect-error - These events might not be in the type definitions yet
    if (chrome.sidePanel.onHidden) {
      // @ts-expect-error - These events might not be in the type definitions yet
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

/**
 * Set up command listeners for keyboard shortcuts
 */
function setupCommandListeners(): void {
  logWithTimestamp('Setting up command listeners for keyboard shortcuts');

  // Log all registered commands to verify our command is registered
  chrome.commands.getAll().then(commands => {
    logWithTimestamp(`Registered commands: ${JSON.stringify(commands)}`);
  }).catch(error => {
    logWithTimestamp(`Error getting registered commands: ${String(error)}`, 'error');
  });

  // Listen for any commands (for future extensibility)
  chrome.commands.onCommand.addListener(async (command) => {
    logWithTimestamp(`Command received: ${command}`);

    // The _execute_action command is handled automatically by Chrome
    // and will trigger the action.onClicked handler

    // This listener is kept for future custom commands and debugging
  });

  logWithTimestamp('Command listeners set up');
}

// Initialize the extension
initializeExtension();

// Export for use in other modules
export default {
  initializeExtension,
  setupEventListeners,
  setupCommandListeners
};
