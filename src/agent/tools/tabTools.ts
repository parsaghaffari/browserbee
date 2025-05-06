import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";

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
        const p = await page.context().newPage();
        if (input.trim()) await p.goto(input.trim());
        return `Opened new tab (#${page.context().pages().length - 1}).`;
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
