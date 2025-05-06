import { crx } from 'playwright-crx';
import { TabState } from './types';
import { logWithTimestamp, handleError } from './utils';

// Track attached tabs and their windows
const attachedTabIds = new Set<number>();
const tabToWindowMap = new Map<number, number>();
const tabStates = new Map<number, TabState>();

// Track fallback tabs (created when attachment fails)
const fallbackTabIds = new Set<number>();

// Current tab ID
let currentTabId: number | null = null;

// Playwright instance
let crxAppPromise: Promise<Awaited<ReturnType<typeof crx.start>>> | null = null;

// Map to store target objects by tab ID and target ID
const targetMap = new Map<number, Map<string, any>>();

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
  
  // Also remove from fallback tabs set if it's a fallback tab
  if (fallbackTabIds.has(tabId)) {
    fallbackTabIds.delete(tabId);
  }
  
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
export async function getCrxApp(forceNew = false): Promise<Awaited<ReturnType<typeof crx.start>>> {
  if (forceNew || !crxAppPromise) {
    logWithTimestamp(forceNew ? 'Forcing new Playwright instance' : 'Initializing shared Playwright instance');
    
    // Close old instance if it exists
    if (crxAppPromise) {
      try {
        const oldApp = await crxAppPromise;
        await oldApp.close().catch(() => {});
      } catch (e) {
        // Ignore errors
      }
      crxAppPromise = null;
    }
    
    // Create new instance
    crxAppPromise = crx.start().then(app => {
      // Set up event listeners
      app.addListener('attached', ({ tabId }) => {
        addAttachedTab(tabId);
        
        // Notify UI components about the attachment
        chrome.runtime.sendMessage({
          action: 'tabStatusChanged',
          status: 'attached',
          tabId
        });
      });
      
      app.addListener('detached', (tabId) => {
        removeAttachedTab(tabId);
        
        // Notify UI components about the detachment
        chrome.runtime.sendMessage({
          action: 'tabStatusChanged',
          status: 'detached',
          tabId
        });
      });
      
      // Target created event (new tab or iframe)
      app.addListener('targetCreated', async (target) => {
        try {
          const targetInfo = {
            type: await target.type(),
            url: await target.url()
          };
          
          logWithTimestamp(`Target created: ${JSON.stringify(targetInfo)}`);
          
          // If this is a page target (tab), we can get its tab ID
          if (targetInfo.type === 'page') {
            // We need to implement a way to get the tab ID from the target
            const tabId = await getTabIdFromTarget(target);
            
            if (tabId) {
              // Store information about this target
              storeTargetInfo(tabId, target, targetInfo);
              
              // Notify UI components
              chrome.runtime.sendMessage({
                action: 'targetCreated',
                tabId,
                targetInfo
              });
            }
          }
        } catch (error) {
          handleError(error, 'handling targetCreated event');
        }
      });
      
      // Target destroyed event
      app.addListener('targetDestroyed', async (target) => {
        try {
          // Try to get the URL before the target is fully destroyed
          let url = '<unknown>';
          try {
            url = await target.url();
          } catch (e: unknown) {
            // Ignore errors getting URL from destroyed target
          }
          
          logWithTimestamp(`Target destroyed: ${url}`);
          
          // If we have a mapping from this target to a tab ID, use it
          const tabId = getTabIdFromTargetMap(target);
          
          if (tabId) {
            // Clean up any stored information about this target
            removeTargetInfo(tabId, target);
            
            // Notify UI components
            chrome.runtime.sendMessage({
              action: 'targetDestroyed',
              tabId,
              url
            });
          }
        } catch (error) {
          handleError(error, 'handling targetDestroyed event');
        }
      });
      
      // Target changed event (e.g., navigation)
      app.addListener('targetChanged', async (target) => {
        try {
          const url = await target.url();
          logWithTimestamp(`Target changed: ${url}`);
          
          // If we have a mapping from this target to a tab ID, use it
          const tabId = getTabIdFromTargetMap(target);
          
          if (tabId) {
            // Update stored information about this target
            updateTargetInfo(tabId, target, { url });
            
            // Update tab title if possible
            try {
              const page = await target.page();
              if (page) {
                const title = await page.title();
                
                // Update the tab state with the new title
                const tabState = getTabState(tabId);
                if (tabState) {
                  setTabState(tabId, { ...tabState, title });
                  
                  // Notify UI components about the title change
                  chrome.runtime.sendMessage({
                    action: 'tabTitleChanged',
                    tabId,
                    title
                  });
                }
              }
            } catch (pageError) {
              // Ignore errors getting page or title
            }
            
            // Notify UI components about the URL change
            chrome.runtime.sendMessage({
              action: 'targetChanged',
              tabId,
              url
            });
          }
        } catch (error) {
          handleError(error, 'handling targetChanged event');
        }
      });
      
      // Page dialog event (alert, confirm, prompt)
      app.addListener('dialog', async (dialog, page) => {
        try {
          const dialogInfo = {
            type: dialog.type(),
            message: dialog.message()
          };
          
          logWithTimestamp(`Dialog in page: ${JSON.stringify(dialogInfo)}`);
          
          // Get the tab ID for this page
          const tabId = await getTabIdFromPage(page);
          
          if (tabId) {
            // Notify UI components about the dialog
            chrome.runtime.sendMessage({
              action: 'pageDialog',
              tabId,
              dialogInfo
            });
            
            // Auto-dismiss dialogs to prevent blocking
            // This behavior could be configurable
            await dialog.dismiss();
          }
        } catch (error) {
          handleError(error, 'handling dialog event');
        }
      });
      
      // Page console event
      app.addListener('console', async (msg, page) => {
        try {
          const consoleInfo = {
            type: msg.type(),
            text: msg.text()
          };
          
          // Only log warnings and errors to avoid noise
          if (consoleInfo.type === 'warning' || consoleInfo.type === 'error') {
            logWithTimestamp(`Console ${consoleInfo.type}: ${consoleInfo.text}`);
            
            // Get the tab ID for this page
            const tabId = await getTabIdFromPage(page);
            
            if (tabId) {
              // Notify UI components about the console message
              chrome.runtime.sendMessage({
                action: 'pageConsole',
                tabId,
                consoleInfo
              });
            }
          }
        } catch (error) {
          handleError(error, 'handling console event');
        }
      });
      
      // Page error event
      app.addListener('pageerror', async (error, page) => {
        try {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logWithTimestamp(`Page error: ${errorMessage}`, 'error');
          
          // Get the tab ID for this page
          const tabId = await getTabIdFromPage(page);
          
          if (tabId) {
            // Notify UI components about the error
            chrome.runtime.sendMessage({
              action: 'pageError',
              tabId,
              error: errorMessage
            });
          }
        } catch (handlingError) {
          handleError(handlingError, 'handling page error event');
        }
      });
      
      return app;
    }).catch(error => {
      logWithTimestamp(`Failed to start Playwright instance: ${error}`, 'error');
      crxAppPromise = null;
      throw error;
    });
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
  fallbackTabIds.clear();
  
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
 * @returns Promise resolving to true if attachment was successful, or the new tab ID if a fallback page was created
 */
export async function attachToTab(tabId: number, windowId?: number, maxRetries = 3): Promise<boolean | number> {
  try {
    logWithTimestamp(`Initializing for tab ${tabId} in window ${windowId || 'unknown'}`);
    
    // First, check if the tab is valid and get its title
    let tabTitle = "Unknown Tab";
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.title) {
        tabTitle = tab.title;
        logWithTimestamp(`Tab ${tabId} title: ${tabTitle}`);
      }
      
      // Check if the tab is valid for attachment
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        logWithTimestamp(`Tab ${tabId} is not valid for attachment, creating new page instead`, 'warn');
        // Return the new tab ID from createNewPageAsFallback
        return await createNewPageAsFallback(tabId, windowId);
      }
    } catch (error) {
      logWithTimestamp(`Error getting tab info: ${error}`, 'warn');
      // Return the new tab ID from createNewPageAsFallback
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
        // Update the tab title in case it changed
        if (tabState.title !== tabTitle) {
          tabState.title = tabTitle;
          setTabState(tabId, tabState);
          logWithTimestamp(`Updated tab title to: ${tabTitle}`);
        }
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
              setTabState(tabId, { page, agent: null, windowId: storedWindowId, title: tabTitle });
              logWithTimestamp(`Successfully attached to tab ${tabId} in window ${storedWindowId} on attempt ${attempt + 1}`);
            } else {
              logWithTimestamp(`Tab ${tabId} not found in window ${storedWindowId}, trying direct attachment`);
              const page = await crxApp.attach(tabId);
              setCurrentTabId(tabId);
              setTabState(tabId, { page, agent: null, title: tabTitle });
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
              setTabState(tabId, { page, agent: null, title: tabTitle });
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
          setTabState(tabId, { page, agent: null, title: tabTitle });
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
 * @returns Promise resolving to the new tab ID
 */
async function createNewPageAsFallback(tabId: number, windowId?: number): Promise<number> {
  logWithTimestamp(`All attachment attempts failed for tab ${tabId}, creating new page`, 'warn');
  
  try {
    // Reset the Playwright instance first
    await resetAfterDebugSessionCancellation();
    
    // Get a fresh Playwright instance
    const crxApp = await getCrxApp();
    
    // Create a new page as fallback
    let page;
    try {
      page = await crxApp.newPage();
      logWithTimestamp(`Created new page instead`);
    } catch (pageError) {
      // Check if this is the "Target page, context or browser has been closed" error
      const errorStr = String(pageError);
      if (errorStr.includes('Target page, context or browser has been closed')) {
        logWithTimestamp(`Browser context was closed, forcing a complete reset before trying again`, 'warn');
        
        // Force a complete reset of the Playwright instance
        await forceResetPlaywright();
        
        // Try again with the fresh instance
        const freshCrxApp = await getCrxApp();
        page = await freshCrxApp.newPage();
        logWithTimestamp(`Successfully created new page after forced reset`);
      } else {
        // For other errors, just re-throw
        throw pageError;
      }
    }
    
    // Get the actual Chrome tab ID for this new page
    let newTabId: number | undefined;
    
    try {
      // Wait a moment for the page to be fully created
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to get the tab ID from the page
      newTabId = await getTabIdFromPage(page);
      
      if (!newTabId) {
        // If we couldn't get the tab ID, use the context pages to find it
        const pages = await crxApp.context().pages();
        const pageIndex = pages.indexOf(page);
        
        if (pageIndex >= 0) {
          // Get all Chrome tabs
          const chromeTabs = await chrome.tabs.query({});
          
          // Find the most recently created tab
          const newestTab = chromeTabs.sort((a, b) => {
            return (b.id || 0) - (a.id || 0);
          })[0];
          
          if (newestTab && newestTab.id) {
            newTabId = newestTab.id;
            logWithTimestamp(`Using newest Chrome tab ID ${newTabId} for fallback page`);
          }
        }
      }
    } catch (idError) {
      handleError(idError, 'getting tab ID for new page');
    }
    
    // If we still don't have a new tab ID, use the original one
    if (!newTabId) {
      logWithTimestamp(`Could not determine new tab ID, using original tab ID ${tabId}`, 'warn');
      newTabId = tabId;
    } else {
      logWithTimestamp(`Created new page with tab ID ${newTabId}`);
    }
    
    // Try to navigate to the same URL if possible
    let tabTitle = "New BrowserBee Tab";
    let originalUrl: string | undefined;
    
    try {
      // Try to get the original tab info
      const tabInfo = await chrome.tabs.get(tabId).catch(() => null);
      if (tabInfo && tabInfo.title) {
        // Only use the original title if we're reusing the same tab ID
        if (newTabId === tabId) {
          tabTitle = tabInfo.title;
        }
      }
      
      if (tabInfo && tabInfo.url && 
          !tabInfo.url.startsWith('chrome://') && 
          !tabInfo.url.startsWith('chrome-extension://')) {
        originalUrl = tabInfo.url;
        await page.goto(originalUrl).catch(e => {
          handleError(e, 'navigating to original URL');
        });
        logWithTimestamp(`Navigated new page to ${originalUrl}`);
      }
    } catch (navError) {
      handleError(navError, 'navigating to tab URL');
    }
    
    // Set the new tab as current
    setCurrentTabId(newTabId);
    
    // Mark this as a fallback tab
    fallbackTabIds.add(newTabId);
    
    // Store the new tab state
    setTabState(newTabId, { 
      page, 
      agent: null, 
      windowId, 
      title: tabTitle 
    });
    
    // If this is a different tab ID than the original, notify UI about the replacement
    if (newTabId !== tabId) {
      logWithTimestamp(`Notifying UI that tab ${tabId} was replaced with ${newTabId}`);
      chrome.runtime.sendMessage({
        action: 'tabReplaced',
        oldTabId: tabId,
        newTabId: newTabId,
        title: tabTitle,
        url: originalUrl
      });
    }
    
    return newTabId;
  } catch (error) {
    handleError(error, 'creating fallback page');
    // Even if creating the fallback page fails, we still want to update the state
    setCurrentTabId(tabId);
    setTabState(tabId, { page: null, agent: null, windowId, title: "Error Page" });
    return tabId;
  }
}

/**
 * Store information about a target for a tab
 * @param tabId The tab ID
 * @param target The target object
 * @param info Additional information about the target
 */
function storeTargetInfo(tabId: number, target: any, info: any): void {
  if (!targetMap.has(tabId)) {
    targetMap.set(tabId, new Map());
  }
  
  // Generate a unique ID for this target if it doesn't have one
  const targetId = target._id || `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store the target with its ID
  targetMap.get(tabId)!.set(targetId, {
    target,
    info,
    timestamp: Date.now()
  });
  
  // Also store the tab ID on the target object if possible
  try {
    // This is a bit of a hack, but it allows us to retrieve the tab ID from the target later
    (target as any)._tabId = tabId;
  } catch (error) {
    // Ignore errors setting property on target
  }
}

/**
 * Update information about a target for a tab
 * @param tabId The tab ID
 * @param target The target object
 * @param info Additional information about the target
 */
function updateTargetInfo(tabId: number, target: any, info: any): void {
  if (!targetMap.has(tabId)) {
    // If we don't have this tab ID in our map, store it
    storeTargetInfo(tabId, target, info);
    return;
  }
  
  // Try to find the target in the map
  const tabTargets = targetMap.get(tabId)!;
  
  // Generate a unique ID for this target if it doesn't have one
  const targetId = target._id || `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Check if we already have this target
  if (tabTargets.has(targetId)) {
    // Update the existing entry
    const existingEntry = tabTargets.get(targetId)!;
    tabTargets.set(targetId, {
      ...existingEntry,
      info: { ...existingEntry.info, ...info },
      timestamp: Date.now()
    });
  } else {
    // Store as a new target
    storeTargetInfo(tabId, target, info);
  }
}

/**
 * Remove information about a target for a tab
 * @param tabId The tab ID
 * @param target The target object
 */
function removeTargetInfo(tabId: number, target: any): void {
  if (!targetMap.has(tabId)) {
    return;
  }
  
  // Generate a unique ID for this target if it doesn't have one
  const targetId = target._id || `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Remove the target from the map
  targetMap.get(tabId)!.delete(targetId);
  
  // If there are no more targets for this tab, remove the tab entry
  if (targetMap.get(tabId)!.size === 0) {
    targetMap.delete(tabId);
  }
}

/**
 * Get the tab ID from a target object
 * @param target The target object
 * @returns The tab ID or undefined if not found
 */
function getTabIdFromTargetMap(target: any): number | undefined {
  // First, try to get the tab ID directly from the target
  if (target._tabId) {
    return target._tabId;
  }
  
  // If that fails, search through our map
  for (const [tabId, tabTargets] of targetMap.entries()) {
    for (const [, entry] of tabTargets.entries()) {
      if (entry.target === target) {
        return tabId;
      }
    }
  }
  
  return undefined;
}

/**
 * Get the tab ID from a page object
 * @param page The page object
 * @returns Promise resolving to the tab ID or undefined if not found
 */
async function getTabIdFromPage(page: any): Promise<number | undefined> {
  try {
    // Try to get the target for this page
    const target = page.target();
    
    // If we have a target, try to get its tab ID
    if (target) {
      return getTabIdFromTargetMap(target);
    }
    
    // If that fails, try to use internal Playwright-CRX APIs
    // This is implementation-specific and might change
    if (page._session && page._session._connection && page._session._connection._transport) {
      const transport = page._session._connection._transport;
      
      // If this is a CrxTransport, it might have a _tabId property
      if (transport._tabId) {
        return transport._tabId;
      }
    }
  } catch (error) {
    handleError(error, 'getting tab ID from page');
  }
  
  return undefined;
}

/**
 * Get the tab ID from a target object using Playwright-CRX internals
 * @param target The target object
 * @returns Promise resolving to the tab ID or undefined if not found
 */
async function getTabIdFromTarget(target: any): Promise<number | undefined> {
  try {
    // First, try to get the page for this target
    const page = await target.page();
    if (page) {
      return getTabIdFromPage(page);
    }
    
    // If that fails, try to use internal Playwright-CRX APIs
    // This is implementation-specific and might change
    if (target._session && target._session._connection && target._session._connection._transport) {
      const transport = target._session._connection._transport;
      
      // If this is a CrxTransport, it might have a _tabId property
      if (transport._tabId) {
        return transport._tabId;
      }
    }
  } catch (error) {
    handleError(error, 'getting tab ID from target');
  }
  
  return undefined;
}

/**
 * Check if a tab is a fallback tab
 * @param tabId The tab ID to check
 * @returns True if the tab is a fallback tab, false otherwise
 */
export function isFallbackTab(tabId: number): boolean {
  return fallbackTabIds.has(tabId);
}

/**
 * Set up tab event listeners
 */
export function setupTabListeners(): void {
  // Listen for tab removal events
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const isAttached = isTabAttached(tabId);
    const isFallback = isFallbackTab(tabId);
    
    if (isAttached) {
      logWithTimestamp(`Tab ${tabId} was closed by user, cleaning up state`);
      removeAttachedTab(tabId);
      
      // Notify UI that the tab was closed
      chrome.runtime.sendMessage({
        action: 'tabStatusChanged',
        status: 'detached',
        tabId,
        reason: 'closed'
      });
      
      // If this is a fallback tab or the current tab, we need to reset the Playwright instance
      // to avoid inconsistent state when trying to attach to another tab later
      if (isFallback || tabId === currentTabId) {
        logWithTimestamp(`Tab ${tabId} was a fallback tab or current tab, resetting Playwright instance`);
        
        // Remove from fallback tabs set if it was a fallback tab
        if (isFallback) {
          fallbackTabIds.delete(tabId);
        }
        
        // Reset the current tab ID if this was the current tab
        if (tabId === currentTabId) {
          setCurrentTabId(null);
        }
        
        // Force reset the Playwright instance to ensure clean state
        await forceResetPlaywright();
      }
    }
  });
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
  fallbackTabIds.clear();
  
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

/**
 * Force reset the Playwright instance
 * Uses the playwright-crx's forceReset method to clean up the instance
 * @returns Promise resolving to true when reset is complete
 */
export async function forceResetPlaywright(): Promise<boolean> {
  logWithTimestamp('Force resetting Playwright instance');
  
  // Reset BrowserBee-specific state
  currentTabId = null;
  attachedTabIds.clear();
  fallbackTabIds.clear();
  targetMap.clear();
  
  try {
    // Check if the forceReset method is available
    if (typeof crx.forceReset === 'function') {
      logWithTimestamp('Using crx.forceReset() method');
      await crx.forceReset();
      logWithTimestamp('Successfully reset Playwright instance using crx.forceReset()');
      
      // Create a new instance after reset
      await getCrxApp(true);
      return true;
    } else {
      logWithTimestamp('crx.forceReset method not available, falling back to basic reset', 'warn');
      
      // Basic reset - clear promise and create new instance
      crxAppPromise = null;
      await getCrxApp(true);
      return true;
    }
  } catch (error) {
    handleError(error, 'force resetting Playwright instance');
    
    // If there's an error, reload the extension as a last resort
    logWithTimestamp('Error during reset, reloading extension');
    setTimeout(() => {
      chrome.runtime.reload();
    }, 500);
    
    return false;
  }
}

// Add global debug functions
Object.assign(self, {
  resetPlaywright: () => {
    crxAppPromise = null;
    return "Playwright instance reset. Reload the extension to apply.";
  },
  reloadExtension: () => {
    chrome.runtime.reload();
    return "Extension reloading...";
  },
  forceCleanup: async () => {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.debugger.detach({ tabId: tab.id });
          } catch (e) {
            // Ignore errors
          }
        }
      }
      return "Debugger detached from all tabs";
    } catch (e) {
      return `Error: ${e}`;
    }
  }
});
