import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx/test";
import { ToolFactory } from "./types";

export const browserNavigate: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_navigate",
    description:
      "Navigate the browser to a specific URL. Input must be a full URL, e.g. https://example.com",
    func: async (url: string) => {
      try {
        await page.goto(url);
        return `Successfully navigated to ${url}`;
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
        await page.waitForLoadState("networkidle");
        return "Navigation complete.";
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
        await page.goBack();
        return "Navigated back.";
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
        await page.goForward();
        return "Navigated forward.";
      } catch (err) {
        return `Error going forward: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
