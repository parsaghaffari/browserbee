import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";
import { withActivePage } from "./utils";

export const browserMoveMouse: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_move_mouse",
    description:
      "Move the mouse cursor to absolute screen coordinates.\n" +
      "Input format: `x|y`  (example: `250|380`)",
    func: async (input: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          const [xRaw, yRaw] = input.split("|").map(s => s.trim());
          const x = Number(xRaw), y = Number(yRaw);
          if (Number.isNaN(x) || Number.isNaN(y))
            return "Error: expected `x|y` numbers (e.g. 120|240)";
          await activePage.mouse.move(x, y);
          return `Mouse moved to (${x}, ${y})`;
        });
      } catch (err) {
        return `Error moving mouse: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserClickXY: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_click_xy",
    description:
      "Left‑click at absolute coordinates.\n" +
      "Input format: `x|y`  (example: `250|380`)",
    func: async (input: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          const [xRaw, yRaw] = input.split("|").map(s => s.trim());
          const x = Number(xRaw), y = Number(yRaw);
          if (Number.isNaN(x) || Number.isNaN(y))
            return "Error: expected `x|y` numbers (e.g. 120|240)";
          await activePage.mouse.click(x, y);
          return `Clicked at (${x}, ${y})`;
        });
      } catch (err) {
        return `Error clicking at coords: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserDrag: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_drag",
    description:
      "Drag‑and‑drop with the left button.\n" +
      "Input format: `startX|startY|endX|endY`  (example: `100|200|300|400`)",
    func: async (input: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          const [sx, sy, ex, ey] = input.split("|").map(s => Number(s.trim()));
          if ([sx, sy, ex, ey].some(v => Number.isNaN(v)))
            return "Error: expected `startX|startY|endX|endY` numbers";
          await activePage.mouse.move(sx, sy);
          await activePage.mouse.down();
          await activePage.mouse.move(ex, ey);
          await activePage.mouse.up();
          return `Dragged (${sx},${sy}) → (${ex},${ey})`;
        });
      } catch (err) {
        return `Error during drag: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
