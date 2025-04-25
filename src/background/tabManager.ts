import { crx } from 'playwright-crx';
import { TabState } from './types';
import { logWithTimestamp, handleError } from './utils';

// Track attached tabs and their windows
const attachedTabIds = new Set<number>();
const tabToWindowMap = new Map<number, number>();
const tabStates = new Map<number, TabState>();

// Current tab ID
let currentTabId: number | null = null;

// Playwright instance
let crxAppPromise: Promise<Awaited<ReturnType<typeof crx.start>>> | null = null;

/**
 * Get the current tab ID
 * @returns The current tab ID or null if no tab is attached
 */
export function getCurrentTabId(): number | null {
  return currentTabId;
}

/**
 * Set the current tab ID
 * @param tabId The tab ID to set as current
 */
export function setCurrentTabId(tabId: number | null): void {
  currentTabId = tabId;
}

/**
 * Get the tab state for a specific tab
 * @param tabId The tab ID to get the state for
 * @returns The tab state or null if not found
 */
export function getTabState(tabId: number): TabState | null {
  return tabStates.get(tabId) || null;
}

/**
 * Set the tab state for a specific tab
 * @param tabId The tab ID to set the state for
 * @param state The state to set
 */
export function setTabState(tabId: number, state: TabState): void {
  tabStates.set(tabId, state);
}

/**
 * Check if a tab is attached
 * @param tabId The tab ID to check
 * @returns True if the tab is attached, false otherwise
 */
export function isTabAttached(tabId: number): boolean {
  return attachedTabIds.has(tabId);
}

/**
 * Add a tab to the attached tabs set
 * @param tabId The tab ID to add
 */
export function addAttachedTab(tabId: number): void {
  attachedTabIds.add(tabId);
  logWithTimestamp(`Tab ${tabId} attached`);
}

/**
 * Remove a tab from the attached tabs set
 * @param tabId The tab ID to remove
 */
export function removeAttachedTab(tabId: number): void {
  attachedTabIds.delete(tabId);
  logWithTimestamp(`Tab ${tabId} detached`);
}

/**
 * Store the window ID for a tab
 * @param tabId The tab ID
 * @param windowId The window ID
 */
export function storeWindowForTab(tabId: number, windowId: number): void {
  tabToWindowMap.set(tabId, windowId);
  logWithTimestamp(`Stored window ID ${windowId} for tab ${tabId}`);
}

/**
 * Get the window ID for a tab
 * @param tabId The tab ID
 * @returns The window ID or undefined if not found
 */
export function getWindowForTab(tabId: number): number | undefined {
  return tabToWindowMap.get(tabId);
}

/**
 * Get or create the shared Playwright instance
 * @param forceNew Whether to force a new instance
 * @returns Promise resolving to the Playwright instance
 */
export async function getCrxApp(forceNew = false) {
  if (forceNew || !crxAppPromise) {
    logWithTimestamp(forceNew ? 'Forcing new Playwright instance' : 'Initializing shared Playwright instance');
    
    // Always set crxAppPromise to null first when forcing a new instance
    // This prevents "crxApplication is already started" errors
    if (forceNew) {
      // Store the old promise to close it later
      const oldPromise = crxAppPromise;
      // Immediately set to null to avoid race conditions
      crxAppPromise = null;
      
      // Close the old instance if it exists
      if (oldPromise) {
        try {
          const oldApp = await oldPromise;
          await oldApp.close().catch(err => {
            // Just log the error but don't throw - we're creating a new instance anyway
            handleError(err, 'closing old Playwright instance');
          });
        } catch (error) {
          // Just log the error but don't throw - we're creating a new instance anyway
          handleError(error, 'accessing old Playwright instance');
        }
      }
    }
    
    // Only create a new instance if crxAppPromise is null
    // This additional check prevents race conditions where multiple calls
    // might try to create instances simultaneously
    if (!crxAppPromise) {
      try {
        // Create a new instance with proper error handling
        crxAppPromise = crx.start().then(app => {
          // Set up event listeners
          app.addListener('attached', ({ tabId }) => {
            addAttachedTab(tabId);
          });
          
          app.addListener('detached', (tabId) => {
            removeAttachedTab(tabId);
          });
          
          return app;
        }).catch(error => {
          // If start fails, set crxAppPromise to null so we can try again
          logWithTimestamp(`Failed to start Playwright instance: ${error}`, 'error');
          crxAppPromise = null;
          throw error;
        });
      } catch (error) {
        // This catch block handles synchronous errors in the try block
        logWithTimestamp(`Error creating Playwright instance: ${error}`, 'error');
        crxAppPromise = null;
        throw error;
      }
    }
  }
  
  return await crxAppPromise;
}

/**
 * Check if the connection to the page is still healthy
 * @param page The page to check
 * @returns True if the connection is healthy, false otherwise
 */
export async function isConnectionHealthy(page: any): Promise<boolean> {
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

/**
 * Reset everything when a debug session is cancelled
 * @returns Promise resolving to true when reset is complete
 */
export async function resetAfterDebugSessionCancellation(): Promise<boolean> {
  logWithTimestamp('Resetting after debug session cancellation');
  
  // Reset all state
  currentTabId = null;
  attachedTabIds.clear();
  
  // Don't clear tabStates or tabToWindowMap as they might be needed later
  
  try {
    // Store the old promise
    const oldPromise = crxAppPromise;
    
    // Immediately set to null to avoid race conditions
    crxAppPromise = null;
    
    // Close the old instance if it exists
    if (oldPromise) {
      try {
        const oldApp = await oldPromise;
        await oldApp.close().catch(err => {
          // Just log the error but don't throw
          handleError(err, 'closing old Playwright instance during reset');
        });
      } catch (error) {
        // Just log the error but don't throw
        handleError(error, 'accessing old Playwright instance during reset');
      }
    }
    
    // Wait a short time to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create a new instance
    await getCrxApp(false); // false because we've already cleaned up
    
    return true;
  } catch (error) {
    handleError(error, 'resetting after debug session cancellation');
    // Even if there's an error, we've reset the state
    return true;
  }
}

/**
 * Check if a tab is valid and available for attachment
 * @param tabId The tab ID to check
 * @returns Promise resolving to true if the tab is valid, false otherwise
 */
async function isTabValid(tabId: number): Promise<boolean> {
  try {
    // Try to get the tab info from Chrome
    const tab = await chrome.tabs.get(tabId);
    
    // Check if the tab exists and is in a valid state for attachment
    // Avoid attaching to chrome:// URLs, extension pages, etc.
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return false;
    }
    
    return true;
  } catch (error) {
    // If we can't get the tab info, it's not valid
    logWithTimestamp(`Tab ${tabId} is not valid: ${error}`, 'warn');
    return false;
  }
}

/**
 * Attachment function with retry mechanism
 * @param tabId The tab ID to attach to
 * @param windowId Optional window ID
 * @param maxRetries Maximum number of retries
 * @returns Promise resolving to true if attachment was successful, false otherwise
 */
export async function attachToTab(tabId: number, windowId?: number, maxRetries = 3): Promise<boolean> {
  try {
    logWithTimestamp(`Initializing for tab ${tabId} in window ${windowId || 'unknown'}`);
    
    // First, check if the tab is valid
    if (!await isTabValid(tabId)) {
      logWithTimestamp(`Tab ${tabId} is not valid for attachment, creating new page instead`, 'warn');
      return await createNewPageAsFallback(tabId, windowId);
    }
    
    // Store the window ID for this tab if provided
    if (windowId) {
      storeWindowForTab(tabId, windowId);
    }
    
    // If already attached, verify the connection is still healthy
    if (isTabAttached(tabId)) {
      const tabState = getTabState(tabId);
      if (tabState && tabState.page && await isConnectionHealthy(tabState.page)) {
        logWithTimestamp(`Tab ${tabId} already attached and connection is healthy`);
        setCurrentTabId(tabId);
        return true;
      } else {
        logWithTimestamp(`Tab ${tabId} was attached but connection is broken, resetting...`, 'warn');
        // If the connection is broken, we need to reset everything
        await resetAfterDebugSessionCancellation();
        removeAttachedTab(tabId);
      }
    }
    
    // Try to attach with retries
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logWithTimestamp(`Attachment attempt ${attempt + 1} for tab ${tabId}`);
        
        // Check if the tab is still valid before each attempt
        if (!await isTabValid(tabId)) {
          logWithTimestamp(`Tab ${tabId} is no longer valid, aborting attachment attempt ${attempt + 1}`, 'warn');
          break;
        }
        
        // Get the shared Playwright instance
        const crxApp = await getCrxApp();
        
        // Try to attach to the tab in the correct window if we have a window ID
        const storedWindowId = getWindowForTab(tabId);
        if (storedWindowId) {
          logWithTimestamp(`Using stored window ID ${storedWindowId} for tab ${tabId}`);
          
          try {
            // Get tabs in the specific window
            const tabsInWindow = await chrome.tabs.query({ windowId: storedWindowId });
            
            // Find our tab in that window
            const tabInWindow = tabsInWindow.find(t => t.id === tabId);
            
            if (tabInWindow) {
              logWithTimestamp(`Found tab ${tabId} in window ${storedWindowId}`);
              const page = await crxApp.attach(tabId);
              setCurrentTabId(tabId);
              setTabState(tabId, { page, agent: null, windowId: storedWindowId });
              logWithTimestamp(`Successfully attached to tab ${tabId} in window ${storedWindowId} on attempt ${attempt + 1}`);
            } else {
              logWithTimestamp(`Tab ${tabId} not found in window ${storedWindowId}, trying direct attachment`);
              const page = await crxApp.attach(tabId);
              setCurrentTabId(tabId);
              setTabState(tabId, { page, agent: null });
              logWithTimestamp(`Successfully attached to tab ${tabId} on attempt ${attempt + 1}`);
            }
          } catch (windowError) {
            // Check if the error is about detached frames
            const errorStr = String(windowError);
            if (errorStr.includes('detached') || errorStr.includes('closed')) {
              logWithTimestamp(`Frame detached error during window-specific attachment, will retry with delay`, 'warn');
              throw windowError; // Re-throw to trigger the retry with delay
            }
            
            handleError(windowError, 'finding tab in window');
            // Fall back to direct attachment
            try {
              const page = await crxApp.attach(tabId);
              setCurrentTabId(tabId);
              setTabState(tabId, { page, agent: null });
              logWithTimestamp(`Successfully attached to tab ${tabId} on attempt ${attempt + 1} (fallback)`);
            } catch (directError) {
              // If direct attachment also fails, throw to trigger retry
              throw directError;
            }
          }
        } else {
          // No window ID stored, use direct attachment
          const page = await crxApp.attach(tabId);
          setCurrentTabId(tabId);
          setTabState(tabId, { page, agent: null });
          logWithTimestamp(`Successfully attached to tab ${tabId} on attempt ${attempt + 1}`);
        }
        
        // Verify the connection is healthy
        const tabState = getTabState(tabId);
        if (tabState && tabState.page && await isConnectionHealthy(tabState.page)) {
          logWithTimestamp(`Connection to tab ${tabId} is healthy`);
          return true;
        } else {
          logWithTimestamp(`Connection to tab ${tabId} is not healthy after attachment, retrying...`, 'warn');
          // If we get here, attachment succeeded but connection is unhealthy
          // Reset everything and try again
          await resetAfterDebugSessionCancellation();
        }
      } catch (error) {
        const errorStr = String(error);
        handleError(error, `attachment attempt ${attempt + 1} for tab ${tabId}`);
        
        // If the error indicates the crxApplication is already started,
        // we need to reset the Playwright instance
        if (errorStr.includes('already started')) {
          logWithTimestamp(`crxApplication is already started, resetting Playwright instance...`, 'warn');
          await resetAfterDebugSessionCancellation();
        }
        
        // If this is the last attempt, don't wait
        if (attempt < maxRetries - 1) {
          // Wait with exponential backoff
          const waitTime = Math.pow(2, attempt) * 500;
          logWithTimestamp(`Waiting ${waitTime}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If we get here, all attachment attempts failed
    return await createNewPageAsFallback(tabId, windowId);
  } catch (error) {
    handleError(error, 'attachToTab');
    return await createNewPageAsFallback(tabId, windowId);
  }
}

/**
 * Create a new page as a fallback when attachment fails
 * @param tabId The tab ID that failed to attach
 * @param windowId Optional window ID
 * @returns Promise resolving to false (indicating attachment failed but fallback was created)
 */
async function createNewPageAsFallback(tabId: number, windowId?: number): Promise<false> {
  logWithTimestamp(`All attachment attempts failed for tab ${tabId}, creating new page`, 'warn');
  
  try {
    // Reset the Playwright instance first
    await resetAfterDebugSessionCancellation();
    
    // Get a fresh Playwright instance
    const crxApp = await getCrxApp();
    
    // Create a new page as fallback
    const page = await crxApp.newPage();
    logWithTimestamp(`Created new page instead`);
    
    // Try to navigate to the same URL
    try {
      const tabInfo = await chrome.tabs.get(tabId);
      if (tabInfo.url && !tabInfo.url.startsWith('chrome://') && !tabInfo.url.startsWith('chrome-extension://')) {
        await page.goto(tabInfo.url);
        logWithTimestamp(`Navigated new page to ${tabInfo.url}`);
      }
    } catch (navError) {
      handleError(navError, 'navigating to tab URL');
    }
    
    setCurrentTabId(tabId);
    setTabState(tabId, { page, agent: null, windowId });
  } catch (error) {
    handleError(error, 'creating fallback page');
    // Even if creating the fallback page fails, we still want to update the state
    setCurrentTabId(tabId);
    setTabState(tabId, { page: null, agent: null, windowId });
  }
  
  return false;
}

/**
 * Clean up when the extension is unloaded
 */
export async function cleanupOnUnload(): Promise<void> {
  logWithTimestamp('Cleaning up on extension unload');
  
  // Store the old promise
  const oldPromise = crxAppPromise;
  
  // Immediately set to null to avoid race conditions
  crxAppPromise = null;
  currentTabId = null;
  attachedTabIds.clear();
  
  // Don't clear tabStates or tabToWindowMap as they might be needed if the extension is reloaded
  
  // Close the old instance if it exists
  if (oldPromise) {
    try {
      const oldApp = await oldPromise;
      await oldApp.close().catch(err => {
        // Just log the error but don't throw
        handleError(err, 'closing Playwright instance during cleanup');
      });
      logWithTimestamp('Successfully closed Playwright instance during cleanup');
    } catch (error) {
      // Just log the error but don't throw
      handleError(error, 'accessing Playwright instance during cleanup');
    }
  }
}
