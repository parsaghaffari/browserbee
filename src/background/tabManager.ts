import { crx } from 'playwright-crx';
import { TabState } from './types';
import { logWithTimestamp, handleError } from './utils';

// Define modes similar to Playwright-CRX
type BrowserBeeMode = 'none' | 'standby' | 'inspecting' | 'automating' | 'detached';

// Track attached tabs and their windows
const attachedTabIds = new Set<number>();
const tabStates = new Map<number, TabState>();
const tabToWindowMap = new Map<number, number>();

// Current tab ID and mode
let currentTabId: number | null = null;
let currentMode: BrowserBeeMode = 'none';

// Playwright instance
let crxAppPromise: Promise<Awaited<ReturnType<typeof crx.start>>> | null = null;

/**
 * Get the current tab ID
 */
export function getCurrentTabId(): number | null {
  return currentTabId;
}

/**
 * Set the current tab ID
 */
export function setCurrentTabId(tabId: number | null): void {
  currentTabId = tabId;
}

/**
 * Get the tab state for a specific tab
 */
export function getTabState(tabId: number): TabState | null {
  return tabStates.get(tabId) || null;
}

/**
 * Set the tab state for a specific tab
 */
export function setTabState(tabId: number, state: TabState): void {
  tabStates.set(tabId, state);
}

/**
 * Check if a tab is attached
 */
export function isTabAttached(tabId: number): boolean {
  return attachedTabIds.has(tabId);
}

/**
 * Add a tab to the attached tabs set
 */
export function addAttachedTab(tabId: number): void {
  attachedTabIds.add(tabId);
  logWithTimestamp(`Tab ${tabId} attached`);
}

/**
 * Remove a tab from the attached tabs set
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
 * Update the action button appearance based on mode
 */
async function updateActionButton(tabId: number, mode: BrowserBeeMode = currentMode): Promise<void> {
  if (!mode || mode === 'none' || mode === 'standby' || mode === 'detached') {
    await Promise.all([
      chrome.action.setTitle({ title: mode === 'none' ? 'BrowserBee: Stopped' : 'BrowserBee: Ready', tabId }),
      chrome.action.setBadgeText({ text: '', tabId }),
    ]).catch(() => {});
    return;
  }

  const { text, title, color, bgColor } = mode === 'automating' ?
    { text: 'AUTO', title: 'BrowserBee: Automating', color: 'white', bgColor: 'darkred' } :
    { text: 'INS', title: 'BrowserBee: Inspecting', color: 'white', bgColor: 'dodgerblue' };

  await Promise.all([
    chrome.action.setTitle({ title, tabId }),
    chrome.action.setBadgeText({ text, tabId }),
    chrome.action.setBadgeTextColor({ color, tabId }),
    chrome.action.setBadgeBackgroundColor({ color: bgColor, tabId }),
  ]).catch(() => {});
}

/**
 * Get or create the shared Playwright instance
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
        updateActionButton(tabId);
        
        // Notify UI components about the attachment
        chrome.runtime.sendMessage({
          action: 'tabStatusChanged',
          status: 'attached',
          tabId
        });
      });
      
      app.addListener('detached', (tabId) => {
        removeAttachedTab(tabId);
        updateActionButton(tabId, 'detached');
        
        // Notify UI components about the detachment
        chrome.runtime.sendMessage({
          action: 'tabStatusChanged',
          status: 'detached',
          tabId
        });
      });
      
      // Target changed event (e.g., navigation)
      app.addListener('targetChanged', async (target) => {
        try {
          const url = await target.url();
          logWithTimestamp(`Target changed: ${url}`);
          
          // Get the page for this target
          const page = await target.page();
          if (!page) return;
          
          // Get the tab ID for this page
          const tabId = page.context().pages().indexOf(page);
          if (tabId < 0) return;
          
          // Update tab title if possible
          try {
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
          } catch (pageError) {
            // Ignore errors getting title
          }
          
          // Notify UI components about the URL change
          chrome.runtime.sendMessage({
            action: 'targetChanged',
            tabId,
            url
          });
        } catch (error) {
          handleError(error, 'handling targetChanged event');
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
 * Set the current mode and update UI
 */
export async function setMode(mode: BrowserBeeMode): Promise<void> {
  currentMode = mode;
  
  // Update action button for all attached tabs
  for (const tabId of attachedTabIds) {
    await updateActionButton(tabId, mode);
  }
  
  // Notify UI components about the mode change
  chrome.runtime.sendMessage({
    action: 'modeChanged',
    mode
  });
}

/**
 * Attach to a tab
 */
export async function attachToTab(tabId: number, windowId?: number): Promise<boolean> {
  try {
    logWithTimestamp(`Attaching to tab ${tabId}`);
    
    // If already attached, just update the UI
    if (isTabAttached(tabId)) {
      logWithTimestamp(`Tab ${tabId} already attached`);
      setCurrentTabId(tabId);
      await updateActionButton(tabId);
      return true;
    }
    
    // Get tab info
    let tabTitle = "Unknown Tab";
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.title) {
        tabTitle = tab.title;
      }
      
      // Check if the tab is valid for attachment
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        logWithTimestamp(`Tab ${tabId} is not valid for attachment`, 'warn');
        return false;
      }
    } catch (error) {
      logWithTimestamp(`Error getting tab info: ${error}`, 'warn');
      return false;
    }
    
    // Get the shared Playwright instance
    const crxApp = await getCrxApp();
    
    try {
      // Store the window ID if provided
      if (windowId) {
        storeWindowForTab(tabId, windowId);
      }
      
      // Attach to the tab
      const page = await crxApp.attach(tabId);
      setCurrentTabId(tabId);
      setTabState(tabId, { page, agent: null, windowId, title: tabTitle });
      
      // Update the action button
      await updateActionButton(tabId);
      
      logWithTimestamp(`Successfully attached to tab ${tabId}`);
      return true;
    } catch (error) {
      handleError(error, `attachment for tab ${tabId}`);
      return false;
    }
  } catch (error) {
    handleError(error, 'attachToTab');
    return false;
  }
}

/**
 * Reset everything
 */
export async function resetPlaywright(): Promise<boolean> {
  logWithTimestamp('Resetting Playwright instance');
  
  // Reset state
  currentTabId = null;
  attachedTabIds.clear();
  // Don't clear tabToWindowMap as it might be needed later
  
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
    
    // Create a new instance
    await getCrxApp(true);
    
    return true;
  } catch (error) {
    handleError(error, 'resetting Playwright instance');
    return false;
  }
}

/**
 * Set up tab event listeners
 */
export function setupTabListeners(): void {
  // Listen for tab removal events
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (isTabAttached(tabId)) {
      logWithTimestamp(`Tab ${tabId} was closed by user, cleaning up state`);
      removeAttachedTab(tabId);
      
      // Notify UI that the tab was closed
      chrome.runtime.sendMessage({
        action: 'tabStatusChanged',
        status: 'detached',
        tabId,
        reason: 'closed'
      });
      
      // Reset the current tab ID if this was the current tab
      if (tabId === currentTabId) {
        setCurrentTabId(null);
      }
    }
  });
  
  // Listen for tab updates to update the action button
  chrome.tabs.onUpdated.addListener(tabId => {
    if (isTabAttached(tabId)) {
      updateActionButton(tabId);
    }
  });
  
  // Set up action button click handler
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    
    // If already attached, toggle mode
    if (isTabAttached(tab.id)) {
      if (currentMode === 'automating') {
        await setMode('inspecting');
      } else if (currentMode === 'inspecting') {
        await setMode('none');
      } else {
        await setMode('automating');
      }
    } else {
      // Otherwise, attach to the tab
      if (await attachToTab(tab.id, tab.windowId)) {
        await setMode('automating');
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
  // Don't clear tabToWindowMap as it might be needed if the extension is reloaded
  
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
 * For backward compatibility with existing code
 */
export async function resetAfterDebugSessionCancellation(): Promise<boolean> {
  return resetPlaywright();
}

/**
 * For backward compatibility with existing code
 */
export function isFallbackTab(tabId: number): boolean {
  return false; // No fallback tabs in this simplified version
}

/**
 * For backward compatibility with existing code
 */
export async function forceResetPlaywright(): Promise<boolean> {
  return resetPlaywright();
}

/**
 * For backward compatibility with existing code
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

// Add global debug functions
Object.assign(self, {
  resetPlaywright: () => {
    resetPlaywright();
    return "Playwright instance reset.";
  },
  reloadExtension: () => {
    chrome.runtime.reload();
    return "Extension reloading...";
  }
});
