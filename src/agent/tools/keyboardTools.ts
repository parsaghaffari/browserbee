import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";
import { withActivePage } from "./utils";

export const browserPressKey: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_press_key",
    description:
      "Press a single key. Input is the key name (e.g. `Enter`, `ArrowLeft`, `a`).",
    func: async (key: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          if (!key.trim()) return "Error: key name required";
          await activePage.keyboard.press(key.trim());
          return `Pressed key: ${key.trim()}`;
        });
      } catch (err) {
        return `Error pressing key '${key}': ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserKeyboardType: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_keyboard_type",
    description:
      "Type arbitrary text at the current focus location. Input is the literal text to type. Use `\\n` for new lines.",
    func: async (text: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          await activePage.keyboard.type(text);
          return `Typed ${text.length} characters`;
        });
      } catch (err) {
        return `Error typing text: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
