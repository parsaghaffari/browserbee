import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";
import { createNewTab, getWindowForTab, getCrxAppForTab } from "../../background/tabManager";

export const browserTabList: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_tab_list",
    description: "Return a list of open tabs with their indexes and URLs.",
    func: async () => {
      try {
        const pages = page.context().pages();
        const list = pages
          .map((p, i) => `${i}: ${p.url() || "<blank>"}`)
          .join("\n");
        return list || "No tabs.";
      } catch (err) {
        return `Error listing tabs: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserTabNew: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_tab_new",
    description:
      "Open a new tab. Optional input = URL to navigate to (otherwise blank tab).",
    func: async (input: string) => {
      try {
        // Get the current tab's ID to find its window
        const currentTabId = await getCurrentTabId(page);
        
        if (!currentTabId) {
          throw new Error("Could not determine current tab ID");
        }
        
        // Get the window ID for the current tab
        const windowId = await getWindowId(page, currentTabId);
        
        if (!windowId) {
          throw new Error("Could not determine window ID for current tab");
        }
        
        // Create a new tab in the same window
        const newTabId = await createNewTab(windowId, input.trim() || undefined);
        
        // Get the new tab's index in the context
        const crxApp = await getCrxAppForTab(currentTabId);
        const pages = crxApp.context().pages();
        const newTabIndex = pages.length - 1;
        
        return `Opened new tab (#${newTabIndex}) in window ${windowId}.`;
      } catch (err) {
        return `Error opening new tab: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserTabSelect: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_tab_select",
    description:
      "Switch focus to a tab by index. Input = integer index from browser_tab_list.",
    func: async (input: string) => {
      try {
        const idx = Number(input.trim());
        if (Number.isNaN(idx))
          return "Error: input must be a tab index (integer).";
        const pages = page.context().pages();
        if (idx < 0 || idx >= pages.length)
          return `Error: index ${idx} out of range (0‑${pages.length - 1}).`;
        await pages[idx].bringToFront();
        return `Switched to tab ${idx}.`;
      } catch (err) {
        return `Error selecting tab: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserTabClose: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_tab_close",
    description:
      "Close a tab. Input = index to close (defaults to current tab if blank).",
    func: async (input: string) => {
      try {
        const pages = page.context().pages();
        const idx =
          input.trim() === "" ? pages.indexOf(page) : Number(input.trim());
        if (Number.isNaN(idx) || idx < 0 || idx >= pages.length)
          return "Error: invalid tab index.";
        await pages[idx].close();
        return `Closed tab ${idx}.`;
      } catch (err) {
        return `Error closing tab: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

/**
 * Helper function to get the current tab ID from a page
 */
async function getCurrentTabId(page: Page): Promise<number | undefined> {
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

/**
 * Helper function to get the window ID for a tab
 */
async function getWindowId(page: Page, tabId: number): Promise<number | undefined> {
  // First try to get the window ID from tabManager
  const windowId = getWindowForTab(tabId);
  
  if (windowId) {
    return windowId;
  }
  
  // If that fails, try to get it from Chrome
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.windowId;
  } catch (error) {
    console.error('Error getting window ID:', error);
  }
  
  return undefined;
}
