import { DynamicTool } from "langchain/tools";
import type { Page, BrowserContext, Dialog } from "playwright-crx/test";

/** Hard cap for anything we stream back to the LLM. */
const MAX_RETURN_CHARS = 20_000;
const MAX_IMG_BASE64_CHARS = 100_000;

/** Truncate long strings so they don’t blow the context window. */
const truncate = (str: string, max = MAX_RETURN_CHARS) =>
  str.length > max
    ? `${str.slice(0, max)}\n… (truncated, total ${str.length} chars)`
    : str;

// ───────────────────────────────────────────────────────────────────────────────
// Core browser‑control tools
// ───────────────────────────────────────────────────────────────────────────────

export const browserNavigate = (page: Page) =>
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

export const browserClick = (page: Page) =>
  new DynamicTool({
    name: "browser_click",
    description:
      "Click an element. Input may be a CSS selector or literal text to match on the page.",
    func: async (input: string) => {
      try {
        if (/[#.\[]/.test(input)) {
          await page.click(input);
          return `Clicked selector: ${input}`;
        }
        await page.getByText(input).click();
        return `Clicked element containing text: ${input}`;
      } catch (error) {
        return `Error clicking '${input}': ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  });

export const browserType = (page: Page) =>
  new DynamicTool({
    name: "browser_type",
    description:
      "Type text. Format: selector|text (e.g. input[name=\"q\"]|hello)",
    func: async (input: string) => {
      try {
        const [selector, text] = input.split("|");
        if (!selector || !text) {
          return "Error: expected 'selector|text'";
        }
        await page.fill(selector, text);
        return `Typed "${text}" into ${selector}`;
      } catch (error) {
        return `Error typing into '${input}': ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  });

export const browserGetTitle = (page: Page) =>
  new DynamicTool({
    name: "browser_get_title",
    description: "Return the current page title.",
    func: async () => {
      try {
        const title = await page.title();
        return `Current page title: ${title}`;
      } catch (error) {
        return `Error getting title: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  });

export const browserWaitForNavigation = (page: Page) =>
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

// ───────────────────────────────────────────────────────────────────────────────
// Observation helpers
// ───────────────────────────────────────────────────────────────────────────────

export const browserSnapshotDom = (page: Page) =>
  new DynamicTool({
    name: "browser_snapshot_dom",
    description:
      "Capture accessibility snapshot of the current page, this is better than screenshot. Optional input = max char length (default 20 000).",
    func: async (input: string) => {
      try {
        const limit = parseInt(input.trim(), 10);
        const html = await page.content();
        return truncate(html, isNaN(limit) ? MAX_RETURN_CHARS : limit);
      } catch (err) {
        return `Error capturing DOM snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserQuery = (page: Page) =>
  new DynamicTool({
    name: "browser_query",
    description:
      "Return up to 10 outerHTML snippets for a CSS selector you provide.",
    func: async (selector: string) => {
      try {
        const matches = (await page.$$eval(
          selector,
          (nodes: Element[]) => nodes.slice(0, 10).map((n) => n.outerHTML)
        )) as string[];
        if (!matches.length) return `No nodes matched ${selector}`;
        return truncate(matches.join("\n\n"));
      } catch (err) {
        return `Error querying '${selector}': ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserAccessibleTree = (page: Page) =>
  new DynamicTool({
    name: "browser_accessible_tree",
    description:
      "Return the AX accessibility tree JSON (default: interesting‑only). Input 'all' to dump full tree.",
    func: async (input: string) => {
      try {
        const interestingOnly = input.trim().toLowerCase() !== "all";
        const tree = await page.accessibility.snapshot({ interestingOnly });
        return truncate(JSON.stringify(tree, null, 2));
      } catch (err) {
        return `Error creating AX snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserReadText = (page: Page) =>
  new DynamicTool({
    name: "browser_read_text",
    description:
      "Return all visible text on the page, concatenated in DOM order.",
    func: async () => {
      try {
        const text = await page.evaluate(() => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) =>
                node.parentElement &&
                node.parentElement.offsetParent !== null &&
                node.textContent!.trim()
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT,
            }
          );
          const out: string[] = [];
          while (walker.nextNode())
            out.push((walker.currentNode as Text).textContent!.trim());
          return out.join("\n");
        });
        return truncate(text as string);
      } catch (err) {
        return `Error extracting text: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserScreenshot = (page: Page) =>
  new DynamicTool({
    name: "browser_screenshot",
    description:
      "Capture a JPEG screenshot and return JSON with:\n" +
      "  data   – Base‑64 data‑URL\n" +
      "  width  – CSS‑pixel width\n" +
      "  height – CSS‑pixel height\n\n" +
      "Input flags (comma‑separated):\n" +
      "  full    – full‑page (else viewport)\n" +
      "  low     – start Q=40 (default 55)\n" +
      "  tiny    – start Q=25\n" +
      "  device  – use device pixels instead of CSS pixels (bigger image)\n\n" +
      "Captures are automatically down‑sampled in quality until ≤ 100 000 chars.",
    func: async (input: string) => {
      try {
        /*── Flags ───────────────────────────────────────────────────────────*/
        const flags = input
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        const fullPage = flags.includes("full");
        const scale = flags.includes("device") ? "device" : ("css" as const);
        let quality = flags.includes("tiny")
          ? 25
          : flags.includes("low")
          ? 40
          : 55;

        /*── helper to capture ──────────────────────────────────────────────*/
        const snap = async (q: number) =>
          page.screenshot({ type: "jpeg", fullPage, quality: q, scale });

        /*── iterative quality back‑off ─────────────────────────────────────*/
        let buf = await snap(quality);
        let b64 = buf.toString("base64");
        while (b64.length > MAX_IMG_BASE64_CHARS && quality > 20) {
          quality = Math.max(20, quality - 10);
          buf = await snap(quality);
          b64 = buf.toString("base64");
        }
        if (b64.length > MAX_IMG_BASE64_CHARS)
          return `Error: screenshot exceeds ${MAX_IMG_BASE64_CHARS} chars even at Q=20.`;

        /*── meta info ──────────────────────────────────────────────────────*/
        const { width, height } = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        })) as { width: number; height: number };

        return JSON.stringify({
          data: `data:image/jpeg;base64,${b64}`,
          width,
          height,
          scale,
          quality,
        });
      } catch (err) {
        return `Error taking screenshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });


/*────────────────────────────  MOUSE TOOLS  ────────────────────────────*/

export const browserMoveMouse = (page: Page) =>
  new DynamicTool({
    name: "browser_move_mouse",
    description:
      "Move the mouse cursor to absolute screen coordinates.\n" +
      "Input format: `x|y`  (example: `250|380`)",
    func: async (input: string) => {
      try {
        const [xRaw, yRaw] = input.split("|").map(s => s.trim());
        const x = Number(xRaw), y = Number(yRaw);
        if (Number.isNaN(x) || Number.isNaN(y))
          return "Error: expected `x|y` numbers (e.g. 120|240)";
        await page.mouse.move(x, y);
        return `Mouse moved to (${x}, ${y})`;
      } catch (err) {
        return `Error moving mouse: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserClickXY = (page: Page) =>
  new DynamicTool({
    name: "browser_click_xy",
    description:
      "Left‑click at absolute coordinates.\n" +
      "Input format: `x|y`  (example: `250|380`)",
    func: async (input: string) => {
      try {
        const [xRaw, yRaw] = input.split("|").map(s => s.trim());
        const x = Number(xRaw), y = Number(yRaw);
        if (Number.isNaN(x) || Number.isNaN(y))
          return "Error: expected `x|y` numbers (e.g. 120|240)";
        await page.mouse.click(x, y);
        return `Clicked at (${x}, ${y})`;
      } catch (err) {
        return `Error clicking at coords: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserDrag = (page: Page) =>
  new DynamicTool({
    name: "browser_drag",
    description:
      "Drag‑and‑drop with the left button.\n" +
      "Input format: `startX|startY|endX|endY`  (example: `100|200|300|400`)",
    func: async (input: string) => {
      try {
        const [sx, sy, ex, ey] = input.split("|").map(s => Number(s.trim()));
        if ([sx, sy, ex, ey].some(v => Number.isNaN(v)))
          return "Error: expected `startX|startY|endX|endY` numbers";
        await page.mouse.move(sx, sy);
        await page.mouse.down();
        await page.mouse.move(ex, ey);
        await page.mouse.up();
        return `Dragged (${sx},${sy}) → (${ex},${ey})`;
      } catch (err) {
        return `Error during drag: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

/*───────────────────────────  KEYBOARD TOOLS  ──────────────────────────*/

export const browserPressKey = (page: Page) =>
  new DynamicTool({
    name: "browser_press_key",
    description:
      "Press a single key. Input is the key name (e.g. `Enter`, `ArrowLeft`, `a`).",
    func: async (key: string) => {
      try {
        if (!key.trim()) return "Error: key name required";
        await page.keyboard.press(key.trim());
        return `Pressed key: ${key.trim()}`;
      } catch (err) {
        return `Error pressing key '${key}': ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserKeyboardType = (page: Page) =>
  new DynamicTool({
    name: "browser_keyboard_type",
    description:
      "Type arbitrary text at the current focus location. Input is the literal text to type. Use `\\n` for new lines.",
    func: async (text: string) => {
      try {
        await page.keyboard.type(text);
        return `Typed ${text.length} characters`;
      } catch (err) {
        return `Error typing text: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

/*──────────────────────────
   Helpers (module‑scoped)
──────────────────────────*/
let lastDialog: Dialog | null = null;
const installDialogListener = (page: Page) => {
  // add only once per context
  const ctx: BrowserContext = page.context();
  if ((ctx as any)._dialogListenerInstalled) return;
  ctx.on("page", p =>
    p.on("dialog", d => {
      lastDialog = d;
    })
  );
  page.on("dialog", d => {
    lastDialog = d;
  });
  (ctx as any)._dialogListenerInstalled = true;
};

/*──────────────────────────
   NAVIGATION HISTORY TOOLS
──────────────────────────*/
export const browserNavigateBack = (page: Page) =>
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

export const browserNavigateForward = (page: Page) =>
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

/*──────────────────────────
   TAB TOOLS
──────────────────────────*/
export const browserTabList = (page: Page) =>
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

export const browserTabNew = (page: Page) =>
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

export const browserTabSelect = (page: Page) =>
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

export const browserTabClose = (page: Page) =>
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

/*──────────────────────────
   DIALOG TOOL
──────────────────────────*/
export const browserHandleDialog = (page: Page) => {
  installDialogListener(page);
  return new DynamicTool({
    name: "browser_handle_dialog",
    description:
      "Accept or dismiss the most recent alert/confirm/prompt dialog.\n" +
      "Input `accept` or `dismiss`. For prompt dialogs you may append `|text` to supply response text.",
    func: async (input: string) => {
      try {
        if (!lastDialog)
          return "Error: no dialog is currently open or was detected.";
        const [action, text] = input.split("|").map(s => s.trim().toLowerCase());
        if (action !== "accept" && action !== "dismiss")
          return "Error: first part must be `accept` or `dismiss`.";
        if (action === "accept")
          await lastDialog.accept(text || undefined);
        else await lastDialog.dismiss();
        const type = lastDialog.type();
        lastDialog = null;
        return `${action === "accept" ? "Accepted" : "Dismissed"} ${type} dialog.`;
      } catch (err) {
        return `Error handling dialog: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
};