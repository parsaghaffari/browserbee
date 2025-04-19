import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx/test";

/** Hard cap for anything we stream back to the LLM. */
const MAX_RETURN_CHARS = 20_000;
const MAX_IMG_BASE64_CHARS = 60_000;

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
      "Return full page HTML. Optional input = max char length (default 20 000).",
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
      "Take a JPEG screenshot and return it as a Base‑64 data‑URL.\n" +
      "Input options (comma‑separated):\n" +
      "  • full   – capture the full page, not just the viewport\n" +
      "  • low    – lower quality (≈40) to save tokens\n" +
      "  • tiny   – very low quality (≈25) for the smallest payload\n" +
      "The tool automatically down‑samples quality until the payload fits",
    func: async (input: string) => {
      try {
        /*──────── parse options ────────*/
        const flags = input
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        const fullPage = flags.includes("full");
        let quality = flags.includes("tiny")
          ? 25
          : flags.includes("low")
          ? 40
          : 60; // default

        /*──────── iterative capture until under size limit ────────*/
        const take = async (q: number) =>
          page.screenshot({ type: "jpeg", fullPage, quality: q });

        let buffer = await take(quality);
        let base64 = buffer.toString("base64");

        while (base64.length > MAX_IMG_BASE64_CHARS && quality > 20) {
          quality = Math.max(20, quality - 10); // step down
          buffer = await take(quality);
          base64 = buffer.toString("base64");
        }

        if (base64.length > MAX_IMG_BASE64_CHARS) {
          return `Error: screenshot still exceeds ${MAX_IMG_BASE64_CHARS} characters at minimum quality.`;
        }

        return `data:image/jpeg;base64,${base64}`;
      } catch (err) {
        return `Error taking screenshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
