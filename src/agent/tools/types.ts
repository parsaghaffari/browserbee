import type { Page, BrowserContext, Dialog } from "playwright-crx/test";
import { DynamicTool } from "langchain/tools";

export interface BrowserTool {
  name: string;
  description: string;
  func: (input: string) => Promise<string>;
}

export type ToolFactory = (page: Page) => DynamicTool;
