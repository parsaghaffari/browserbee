import type { Page, Dialog } from "playwright-crx";
import { getCurrentPage } from "../PageContextManager";

/**
 * Helper function to get the current tab ID from a page
 * @param page The page to get the tab ID for
 * @returns Promise resolving to the tab ID or undefined if not found
 */
export async function getCurrentTabId(page: Page): Promise<number | undefined> {
  try {
    // Try to use internal Playwright-CRX APIs to get the tab ID
    if ((page as any)._session && (page as any)._session._connection && (page as any)._session._connection._transport) {
      const transport = (page as any)._session._connection._transport;
      
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
      
      // Try to match by URL
      const pageUrl = page.url();
      const matchingTab = chromeTabs.find(tab => tab.url === pageUrl);
      
      if (matchingTab && matchingTab.id) {
        return matchingTab.id;
      }
    }
  } catch (error) {
    console.error('Error getting current tab ID:', error);
  }
  
  return undefined;
}

// Constants for output size limits
export const MAX_RETURN_CHARS = 20000;
export const MAX_SCREENSHOT_CHARS = 500000;

/**
 * Helper function to execute a function with the active page from PageContextManager
 * @param page The original page reference
 * @param fn The function to execute with the active page
 * @returns The result of the function
 */
export async function withActivePage<T>(
  page: Page, 
  fn: (activePage: Page) => Promise<T>
): Promise<T> {
  // Get the current active page from PageContextManager
  const activePage = getCurrentPage(page);
  
  // Add debugging logs
  try {
    let originalUrl = "unknown";
    let activeUrl = "unknown";
    
    try {
      originalUrl = await page.url();
    } catch (e) {
      // Ignore errors getting original URL
    }
    
    try {
      activeUrl = await activePage.url();
    } catch (e) {
      // Ignore errors getting active URL
    }
    
    console.log(`withActivePage: Original page URL: ${originalUrl}`);
    console.log(`withActivePage: Active page URL: ${activeUrl}`);
    
    if (originalUrl !== activeUrl) {
      console.log(`withActivePage: Using different page from PageContextManager`);
    }
  } catch (error) {
    console.log(`withActivePage: Error getting URLs for debugging: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Execute the function with the active page
  return await fn(activePage);
}

/**
 * Truncate a string to a maximum length
 * @param str The string to truncate
 * @param maxLength The maximum length (default: MAX_RETURN_CHARS)
 * @returns The truncated string
 */
export function truncate(str: string, maxLength: number = MAX_RETURN_CHARS): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + `\n\n[Truncated ${str.length - maxLength} characters]`;
}

// Dialog handling
export let lastDialog: Dialog | null = null;

export function resetDialog() {
  lastDialog = null;
}

export function installDialogListener(page: Page) {
  // Get the active page
  const activePage = getCurrentPage(page);
  
  // Install the dialog listener on the active page
  activePage.on("dialog", dialog => {
    lastDialog = dialog;
  });
}
