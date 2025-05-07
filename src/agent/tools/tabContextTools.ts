import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";
import { getCurrentPage } from "../PageContextManager";

/**
 * Tool to get information about the currently active tab
 */
export const browserGetActiveTab: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_get_active_tab",
    description: "Returns information about the currently active tab, including its index, URL, and title.",
    func: async () => {
      try {
        // Get the current active page from the PageContextManager
        const activePage = getCurrentPage(page);
        
        // Get all pages in the context
        const pages = activePage.context().pages();
        
        // Find the index of the current page
        const activeIndex = pages.indexOf(activePage);
        
        // Get the URL and title of the current page
        const url = activePage.url();
        const title = await activePage.title();
        
        // Return a JSON object with the information
        return JSON.stringify({
          activeTabIndex: activeIndex,
          url: url,
          title: title,
          totalTabs: pages.length
        }, null, 2);
      } catch (err) {
        return `Error getting active tab: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

/**
 * Tool to navigate a specific tab to a URL
 */
export const browserNavigateTab: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_navigate_tab",
    description: "Navigate a specific tab to a URL. Input format: 'tabIndex|url' (e.g., '1|https://example.com')",
    func: async (input: string) => {
      try {
        // Split the input into tab index and URL
        const parts = input.split('|');
        if (parts.length !== 2) {
          return "Error: Input must be in the format 'tabIndex|url'";
        }
        
        const indexStr = parts[0].trim();
        const url = parts[1].trim();
        
        // Parse the tab index
        const idx = Number(indexStr);
        if (Number.isNaN(idx)) {
          return "Error: Tab index must be a number";
        }
        
        // Get the current active page from the PageContextManager
        const activePage = getCurrentPage(page);
        
        // Get all pages in the context
        const pages = activePage.context().pages();
        
        // Check if the index is valid
        if (idx < 0 || idx >= pages.length) {
          return `Error: Tab index ${idx} out of range (0‑${pages.length - 1})`;
        }
        
        // Navigate the specified tab to the URL
        await pages[idx].goto(url);
        
        return `Successfully navigated tab ${idx} to ${url}`;
      } catch (error) {
        return `Error: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  });

/**
 * Tool to take a screenshot of a specific tab
 */
export const browserScreenshotTab: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_screenshot_tab",
    description: "Take a screenshot of a specific tab by index. Input format: 'tabIndex[,flags]' (e.g., '1,full')",
    func: async (input: string) => {
      try {
        // Split the input into tab index and flags
        const parts = input.split(',');
        const tabIndexStr = parts[0].trim();
        const flags = parts.slice(1).map(f => f.trim());
        
        // Parse the tab index
        const tabIndex = parseInt(tabIndexStr, 10);
        if (isNaN(tabIndex)) {
          return "Error: First parameter must be a tab index number";
        }
        
        // Get the current active page from the PageContextManager
        const activePage = getCurrentPage(page);
        
        // Get all pages in the context
        const pages = activePage.context().pages();
        
        // Check if the index is valid
        if (tabIndex < 0 || tabIndex >= pages.length) {
          return `Error: Tab index ${tabIndex} out of range (0-${pages.length - 1})`;
        }
        
        // Get the target page
        const targetPage = pages[tabIndex];
        
        // Set screenshot options based on flags
        const fullPage = flags.includes("full");
        const quality = 40; // Default quality
        
        // Take the screenshot
        const buffer = await targetPage.screenshot({ 
          type: "jpeg", 
          fullPage, 
          quality 
        });
        
        // Convert to base64
        const base64 = buffer.toString("base64");
        
        // Return the screenshot as a JSON object
        return JSON.stringify({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: base64
          }
        });
      } catch (err) {
        return `Error taking screenshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
