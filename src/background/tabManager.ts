import { crx } from 'playwright-crx';
import { TabState, WindowState } from './types';
import { logWithTimestamp, handleError } from './utils';
import { BrowserAgent } from '../agent/AgentCore';

// Define modes similar to Playwright-CRX
type BrowserBeeMode = 'none' | 'standby' | 'inspecting' | 'automating' | 'detached';

// Track attached tabs and their windows
const attachedTabIds = new Set<number>();
const tabStates = new Map<number, TabState>();
const tabToWindowMap = new Map<number, number>();

// Track agents by window ID
const windowToAgentMap = new Map<number, BrowserAgent>();

// Current tab ID and mode
let currentTabId: number | null = null;
let currentMode: BrowserBeeMode = 'none';

// Map of window IDs to Playwright instances
const windowToCrxAppMap = new Map<number, Promise<Awaited<ReturnType<typeof crx.start>>>>();

// Default Playwright instance for cases where window ID is not available
let defaultCrxAppPromise: Promise<Awaited<ReturnType<typeof crx.start>>> | null = null;

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
 * Get the agent for a specific window
 * @param windowId The window ID to get the agent for
 * @returns The agent for the window or null if not found
 */
export function getAgentForWindow(windowId: number): BrowserAgent | null {
  return windowToAgentMap.get(windowId) || null;
}

/**
 * Set the agent for a specific window
 * @param windowId The window ID to set the agent for
 * @param agent The agent to set
 */
export function setAgentForWindow(windowId: number, agent: BrowserAgent): void {
  windowToAgentMap.set(windowId, agent);
  logWithTimestamp(`Set agent for window ${windowId}`);
}

/**
 * Get the agent for a specific tab
 * @param tabId The tab ID to get the agent for
 * @returns The agent for the tab's window or null if not found
 */
export function getAgentForTab(tabId: number): BrowserAgent | null {
  const windowId = getWindowForTab(tabId);
  if (!windowId) return null;
  return getAgentForWindow(windowId);
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
 * Get or create a Playwright instance for a specific window
 * @param windowId The window ID to get the instance for
 * @param forceNew Whether to force a new instance
 * @returns Promise resolving to the Playwright instance
 */
export async function getCrxApp(windowId?: number, forceNew = false): Promise<Awaited<ReturnType<typeof crx.start>>> {
  // If no window ID is provided, use the default instance
  if (!windowId) {
    if (forceNew || !defaultCrxAppPromise) {
      logWithTimestamp(forceNew ? 'Forcing new default Playwright instance' : 'Initializing default Playwright instance');
      
      // Close old instance if it exists
      if (defaultCrxAppPromise) {
        try {
          const oldApp = await defaultCrxAppPromise;
          await oldApp.close().catch(() => {});
        } catch (e) {
          // Ignore errors
        }
        defaultCrxAppPromise = null;
      }
      
      // Create new instance
      defaultCrxAppPromise = createCrxApp();
    }
    
    return await defaultCrxAppPromise;
  }
  
  // If a window ID is provided, get or create an instance for that window
  if (forceNew || !windowToCrxAppMap.has(windowId)) {
    logWithTimestamp(forceNew 
      ? `Forcing new Playwright instance for window ${windowId}` 
      : `Initializing Playwright instance for window ${windowId}`);
    
    // Close old instance if it exists
    if (windowToCrxAppMap.has(windowId)) {
      try {
        const oldApp = await windowToCrxAppMap.get(windowId)!;
        await oldApp.close().catch(() => {});
      } catch (e) {
        // Ignore errors
      }
      windowToCrxAppMap.delete(windowId);
    }
    
    // Create new instance
    const appPromise = createCrxApp();
    windowToCrxAppMap.set(windowId, appPromise);
  }
  
  return await windowToCrxAppMap.get(windowId)!;
}

/**
 * Create a new Playwright instance with event listeners
 * @returns Promise resolving to the Playwright instance
 */
function createCrxApp(): Promise<Awaited<ReturnType<typeof crx.start>>> {
  return crx.start().then(app => {
    // Set up event listeners
    app.addListener('attached', ({ tabId }) => {
      addAttachedTab(tabId);
      updateActionButton(tabId);
      
      // Notify UI components about the attachment
      chrome.runtime.sendMessage({
        action: 'tabStatusChanged',
        status: 'attached',
        tabId,
        windowId: getWindowForTab(tabId)
      });
    });
    
    app.addListener('detached', (tabId) => {
      removeAttachedTab(tabId);
      updateActionButton(tabId, 'detached');
      
      // Notify UI components about the detachment
      chrome.runtime.sendMessage({
        action: 'tabStatusChanged',
        status: 'detached',
        tabId,
        windowId: getWindowForTab(tabId)
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
                windowId: getWindowForTab(tabId),
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
            windowId: getWindowForTab(tabId),
            url
          });
      } catch (error) {
        handleError(error, 'handling targetChanged event');
      }
    });
    
    return app;
  }).catch(error => {
    logWithTimestamp(`Failed to start Playwright instance: ${error}`, 'error');
    throw error;
  });
}

/**
 * Get the Playwright instance for a specific tab
 * @param tabId The tab ID to get the instance for
 * @returns Promise resolving to the Playwright instance
 */
export async function getCrxAppForTab(tabId: number): Promise<Awaited<ReturnType<typeof crx.start>>> {
  const windowId = getWindowForTab(tabId);
  return getCrxApp(windowId);
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
      
      // If windowId is not provided, get it from the tab
      if (!windowId && tab.windowId) {
        windowId = tab.windowId;
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
    
    // Store the window ID if provided
    if (windowId) {
      storeWindowForTab(tabId, windowId);
    }
    
    // Get the Playwright instance for this window
    const crxApp = await getCrxApp(windowId);
    
    try {
      // Attach to the tab
      const page = await crxApp.attach(tabId);
      setCurrentTabId(tabId);
      setTabState(tabId, { page, windowId, title: tabTitle });
      
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
 * Create a new tab in a specific window
 * @param windowId The window ID to create the tab in
 * @param url Optional URL to navigate to
 * @returns Promise resolving to the new tab ID
 */
export async function createNewTab(windowId: number, url?: string): Promise<number> {
  try {
    logWithTimestamp(`Creating new tab in window ${windowId}${url ? ` with URL ${url}` : ''}`);
    
    // Get the Playwright instance for this window
    const crxApp = await getCrxApp(windowId);
    
    // Create a new tab using Playwright-CRX's newPage method with the windowId
    const page = await crxApp.newPage({ windowId, url: url || undefined });
    
    // Get the tab ID from the page
    const tabId = await getTabIdFromPage(page);
    
    if (!tabId) {
      throw new Error('Could not determine tab ID for new page');
    }
    
    // Store the window ID for this tab
    storeWindowForTab(tabId, windowId);
    
    logWithTimestamp(`Created new tab ${tabId} in window ${windowId}`);
    return tabId;
  } catch (error) {
    handleError(error, 'creating new tab');
    throw error;
  }
}

/**
 * Get the tab ID from a page object
 * @param page The page object
 * @returns Promise resolving to the tab ID or undefined if not found
 */
async function getTabIdFromPage(page: any): Promise<number | undefined> {
  try {
    // Try to use internal Playwright-CRX APIs to get the tab ID
    if (page._session && page._session._connection && page._session._connection._transport) {
      const transport = page._session._connection._transport;
      
      // If this is a CrxTransport, it might have a _tabId property
      if (transport._tabId) {
        return transport._tabId;
      }
    }
    
    // If that fails, try to get the tab ID from Chrome
    // This is a fallback method that might not always work
    const pages = page.context().pages();
    const pageIndex = pages.indexOf(page);
    
    if (pageIndex >= 0) {
      // Get all Chrome tabs
      const chromeTabs = await chrome.tabs.query({});
      
      // Find the most recently created tab
      const newestTab = chromeTabs.sort((a, b) => {
        return (b.id || 0) - (a.id || 0);
      })[0];
      
      if (newestTab && newestTab.id) {
        return newestTab.id;
      }
    }
  } catch (error) {
    handleError(error, 'getting tab ID from page');
  }
  
  return undefined;
}

/**
 * Reset everything
 */
export async function resetPlaywright(): Promise<boolean> {
  logWithTimestamp('Resetting all Playwright instances');
  
  // Reset state
  currentTabId = null;
  attachedTabIds.clear();
  // Don't clear tabToWindowMap as it might be needed later
  // Don't clear windowToAgentMap as agents are managed separately
  
  try {
    // Close all window-specific instances
    const closePromises: Promise<void>[] = [];
    
    for (const [windowId, appPromise] of windowToCrxAppMap.entries()) {
      try {
        const app = await appPromise;
        closePromises.push(app.close().catch(err => {
          handleError(err, `closing Playwright instance for window ${windowId}`);
        }));
      } catch (error) {
        handleError(error, `accessing Playwright instance for window ${windowId}`);
      }
    }
    
    // Clear the map
    windowToCrxAppMap.clear();
    
    // Close the default instance if it exists
    if (defaultCrxAppPromise) {
      try {
        const app = await defaultCrxAppPromise;
        closePromises.push(app.close().catch(err => {
          handleError(err, 'closing default Playwright instance');
        }));
      } catch (error) {
        handleError(error, 'accessing default Playwright instance');
      }
      defaultCrxAppPromise = null;
    }
    
    // Wait for all close operations to complete
    await Promise.all(closePromises);
    
    // Create a new default instance
    await getCrxApp(undefined, true);
    
    return true;
  } catch (error) {
    handleError(error, 'resetting Playwright instances');
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
  
  // Listen for window removal events
  chrome.windows.onRemoved.addListener(async (windowId) => {
    logWithTimestamp(`Window ${windowId} was closed, cleaning up Playwright instance and agent`);
    
    // Close the Playwright instance for this window if it exists
    if (windowToCrxAppMap.has(windowId)) {
      try {
        const app = await windowToCrxAppMap.get(windowId)!;
        await app.close().catch(err => {
          handleError(err, `closing Playwright instance for window ${windowId}`);
        });
      } catch (error) {
        handleError(error, `accessing Playwright instance for window ${windowId}`);
      }
      windowToCrxAppMap.delete(windowId);
    }
    
    // Remove the agent for this window
    if (windowToAgentMap.has(windowId)) {
      logWithTimestamp(`Removing agent for window ${windowId}`);
      windowToAgentMap.delete(windowId);
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
  
  // Reset state
  currentTabId = null;
  attachedTabIds.clear();
  // Don't clear tabToWindowMap as it might be needed if the extension is reloaded
  // Don't clear windowToAgentMap as agents are managed separately
  
  // Close all window-specific instances
  const closePromises: Promise<void>[] = [];
  
  for (const [windowId, appPromise] of windowToCrxAppMap.entries()) {
    try {
      const app = await appPromise;
      closePromises.push(app.close().catch(err => {
        handleError(err, `closing Playwright instance for window ${windowId}`);
      }));
    } catch (error) {
      handleError(error, `accessing Playwright instance for window ${windowId}`);
    }
  }
  
  // Clear the map
  windowToCrxAppMap.clear();
  
  // Close the default instance if it exists
  if (defaultCrxAppPromise) {
    try {
      const app = await defaultCrxAppPromise;
      closePromises.push(app.close().catch(err => {
        handleError(err, 'closing default Playwright instance');
      }));
    } catch (error) {
      handleError(error, 'accessing default Playwright instance');
    }
    defaultCrxAppPromise = null;
  }
  
  // Wait for all close operations to complete
  await Promise.all(closePromises);
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
    return "Playwright instances reset.";
  },
  reloadExtension: () => {
    chrome.runtime.reload();
    return "Extension reloading...";
  }
});
