import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";
import { withActivePage, getCurrentTabId } from "./utils";

export const browserNavigate: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_navigate",
    description:
      "Navigate the browser to a specific URL. Input must be a full URL, e.g. https://example.com",
    func: async (url: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          // Navigate to the URL
          await activePage.goto(url);
          
          // Get the tab ID and title after navigation
          try {
            const tabId = await getCurrentTabId(activePage);
            const newTitle = await activePage.title();
            
            // Send a message to update the UI with the new tab title
            if (tabId) {
              chrome.runtime.sendMessage({
                action: 'tabTitleChanged',
                tabId: tabId,
                title: newTitle
              });
              console.log(`Sent tabTitleChanged message for tab ${tabId} with title "${newTitle}" after navigation to ${url}`);
              
              // Also send a targetChanged message
              chrome.runtime.sendMessage({
                action: 'targetChanged',
                tabId: tabId,
                url: url
              });
            }
          } catch (titleError) {
            console.error("Error updating UI after navigation:", titleError);
          }
          
          return `Successfully navigated to ${url}`;
        });
      } catch (error) {
        return `Error navigating to ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  });

export const browserWaitForNavigation: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_wait_for_navigation",
    description: "Wait until network is idle (Playwright).",
    func: async () => {
      try {
        return await withActivePage(page, async (activePage) => {
          await activePage.waitForLoadState("networkidle");
          return "Navigation complete.";
        });
      } catch (error) {
        return `Error waiting for navigation: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  });

export const browserNavigateBack: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_navigate_back",
    description: "Go back to the previous page (history.back()). No input.",
    func: async () => {
      try {
        return await withActivePage(page, async (activePage) => {
          await activePage.goBack();
          return "Navigated back.";
        });
      } catch (err) {
        return `Error going back: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserNavigateForward: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_navigate_forward",
    description: "Go forward to the next page (history.forward()). No input.",
    func: async () => {
      try {
        return await withActivePage(page, async (activePage) => {
          await activePage.goForward();
          return "Navigated forward.";
        });
      } catch (err) {
        return `Error going forward: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
