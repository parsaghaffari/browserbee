import type { Page } from "playwright-crx";
import { BrowserTool, ToolExecutionContext } from "./tools/types";

/**
 * ToolManager handles tool wrapping with health checks,
 * tab tool handling, and tool execution context.
 */
export class ToolManager {
  private page: Page;
  private tools: BrowserTool[] = [];

  // Flag to indicate if we should use tab tools exclusively
  private useTabToolsOnly: boolean = false;

  constructor(page: Page, tools: BrowserTool[]) {
    this.page = page;
    this.updateTools(tools);
  }

  /**
   * Get all tools managed by this ToolManager
   */
  getTools(): BrowserTool[] {
    return this.tools;
  }

  /**
   * Update the tools used by the PromptManager
   */
  updateTools(tools: BrowserTool[]): void {
    // Wrap non-tab tools with health check
    this.tools = tools.map(tool => {
      // Tab tools don't need health check as they operate at browser context level
      if (this.isTabTool(tool.name)) {
        return tool;
      }
      return this.wrapToolWithHealthCheck(tool);
    });
  }

  updateTool(tool: BrowserTool): void {
    const index = this.tools.findIndex(t => t.name === tool.name);
    if (index !== -1) {
      this.tools[index] = tool;
    } else {
      this.tools.push(tool);
    }
  }

  /**
   * Find a tool by name
   */
  findTool(toolName: string): BrowserTool | undefined {
    return this.tools.find(t => t.name === toolName);
  }

  /**
   * Check if the connection to the page is still healthy
   */
  async isConnectionHealthy(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Try a simple operation that would fail if the connection is broken
      await this.page.evaluate(() => true);
      this.useTabToolsOnly = false; // Connection is healthy, use all tools
      return true;
    } catch (error) {
      console.log("Agent connection health check failed:", error);
      this.useTabToolsOnly = true; // Connection is broken, use tab tools only
      return false;
    }
  }

  /**
   * Check if a tool is a tab tool
   */
  private isTabTool(toolName: string): boolean {
    return toolName.startsWith('browser_tab_');
  }

  /**
   * Wrap a tool's function with a health check
   */
  private wrapToolWithHealthCheck(tool: BrowserTool): BrowserTool {
    const originalFunc = tool.func;
    const toolName = tool.name;
    const isTabTool = this.isTabTool(toolName);

    // Create a new function that checks health before executing
    tool.func = async (input: string, context?: ToolExecutionContext) => {
      try {
        // For non-tab tools, check connection health
        if (!isTabTool && !await this.isConnectionHealthy()) {
          // If this is a navigation tool, suggest using tab tools instead
          if (toolName === 'browser_navigate') {
            return `Error: Debug session was closed. Please use browser_tab_new instead with the URL as input. Example: browser_tab_new | ${input}`;
          }

          // For screenshot or other observation tools, suggest creating a new tab
          if (toolName.includes('screenshot') || toolName.includes('read') || toolName.includes('title')) {
            return `Error: Debug session was closed. Please create a new tab first using browser_tab_new, then select it with browser_tab_select, and try again.`;
          }

          // Generic message for other tools
          return "Error: Debug session was closed. Please use tab tools (browser_tab_new, browser_tab_select, etc.) to create and work with a new tab.";
        }

        // If connection is healthy or this is a tab tool, execute the original function
        return await originalFunc(input, context);
      } catch (error) {
        // If this is a tab tool, provide a more helpful error message
        if (isTabTool) {
          return `Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}. Tab tools should still work even with a closed debug session. Try browser_tab_new to create a fresh tab.`;
        }

        // For other tools, suggest using tab tools if the error might be related to a closed session
        const errorStr = String(error);
        if (errorStr.includes('closed') || errorStr.includes('detached') || errorStr.includes('destroyed')) {
          this.useTabToolsOnly = true; // Set the flag to use tab tools only
          return `Error: Debug session appears to be closed. Please use tab tools (browser_tab_new, browser_tab_select, etc.) to create and work with a new tab.`;
        }

        return `Error executing tool: ${error instanceof Error ? error.message : String(error)}`;
      }
    };

    return tool;
  }
}
