import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { createNewTab, getWindowForTab, getCrxAppForTab } from "../../background/tabManager";
import { setCurrentPage } from "../PageContextManager";
import { ToolFactory } from "./types";
import { getCurrentTabId } from "./utils";

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
      "Open a new tab. Optional input = URL to navigate to (otherwise blank tab). Note: This does NOT automatically switch to the new tab. Use browser_tab_select after creating a new tab if you want to interact with it.",
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
        
        // Get the title of the new tab
        let newTitle = "New Tab";
        try {
          // Wait a moment for the page to load
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the title
          newTitle = await pages[newTabIndex].title();
          
          // Send a message to notify about the new tab (but don't update the UI title yet)
          chrome.runtime.sendMessage({
            action: 'targetCreated',
            tabId: newTabId,
            targetInfo: {
              title: newTitle,
              url: await pages[newTabIndex].url()
            }
          });
          console.log(`Sent targetCreated message for new tab ${newTabId} with title "${newTitle}"`);
        } catch (titleError) {
          console.error("Error getting new tab title:", titleError);
        }
        
        // Note: We don't update the PageContextManager here because we're not switching to the new tab
        // The user must explicitly call browser_tab_select to switch to the new tab
        
        return `Opened new tab (#${newTabIndex}) in window ${windowId}. To interact with this tab, use browser_tab_select with index ${newTabIndex}.`;
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
      "Switch focus to a tab by index. Input = integer index from browser_tab_list. IMPORTANT: After switching tabs, you must use browser_get_active_tab to confirm the switch was successful and to get information about the new active tab.",
    func: async (input: string) => {
      try {
        const idx = Number(input.trim());
        if (Number.isNaN(idx))
          return "Error: input must be a tab index (integer).";
        const pages = page.context().pages();
        if (idx < 0 || idx >= pages.length)
          return `Error: index ${idx} out of range (0‑${pages.length - 1}).`;
        
        // Switch to the tab
        await pages[idx].bringToFront();
        
        // Update the current page in the PageContextManager
        setCurrentPage(pages[idx]);
        
        // Get information about the new tab
        const newUrl = pages[idx].url();
        let newTitle = "Unknown";
        try {
          newTitle = await pages[idx].title();
          
          // Get the tab ID for the selected page
          const selectedTabId = await getCurrentTabId(pages[idx]);
          
          // Get the original tab ID (the one that was active before switching)
          const originalTabId = await getCurrentTabId(page);
          
          // Send a message to update the UI with the new tab title
          if (selectedTabId) {
            // First, send a message to notify that the active tab has changed
            // This will allow the UI to update its tabId state
            chrome.runtime.sendMessage({
              action: 'activeTabChanged',
              oldTabId: originalTabId,
              newTabId: selectedTabId,
              title: newTitle,
              url: newUrl
            });
            console.log(`Sent activeTabChanged message from tab ${originalTabId} to ${selectedTabId}`);
            
            // Then send the regular tabTitleChanged message
            chrome.runtime.sendMessage({
              action: 'tabTitleChanged',
              tabId: selectedTabId,
              title: newTitle
            });
            console.log(`Sent tabTitleChanged message for tab ${selectedTabId} with title "${newTitle}"`);
          }
        } catch (titleError) {
          // Ignore errors getting title
          console.error("Error getting tab title:", titleError);
        }
        
        return `Switched to tab ${idx}. Now active: "${newTitle}" (${newUrl}). Use browser_get_active_tab for more details.`;
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
        
        // Get the tab ID before closing
        const tabToClose = pages[idx];
        const tabId = await getCurrentTabId(tabToClose);
        
        // Close the tab
        await tabToClose.close();
        
        // If we closed the current tab, we need to update the PageContextManager
        // with a new active page (if available)
        if (pages.indexOf(page) === idx && pages.length > 1) {
          // Find the new active page (usually the one to the left)
          const newActiveIdx = Math.max(0, idx - 1);
          if (pages[newActiveIdx]) {
            setCurrentPage(pages[newActiveIdx]);
            
            // Get the title of the new active tab
            try {
              const newActiveTabId = await getCurrentTabId(pages[newActiveIdx]);
              const newActiveTitle = await pages[newActiveIdx].title();
              
              // Send a message to update the UI with the new active tab title
              if (newActiveTabId) {
                chrome.runtime.sendMessage({
                  action: 'tabTitleChanged',
                  tabId: newActiveTabId,
                  title: newActiveTitle
                });
                console.log(`Tab ${idx} closed, switched to tab ${newActiveIdx} with title "${newActiveTitle}"`);
              }
            } catch (titleError) {
              console.error("Error getting new active tab title:", titleError);
            }
          }
        }
        
        // Notify that the tab was closed
        if (tabId) {
          chrome.runtime.sendMessage({
            action: 'targetDestroyed',
            tabId: tabId,
            url: 'about:blank' // We don't have the URL anymore since the tab is closed
          });
        }
        
        return `Closed tab ${idx}.`;
      } catch (err) {
        return `Error closing tab: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

// getCurrentTabId is now imported from utils.ts

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
