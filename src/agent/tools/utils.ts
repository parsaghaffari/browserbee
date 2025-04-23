/** Hard cap for anything we stream back to the LLM. */
export const MAX_RETURN_CHARS = 20_000;
export const MAX_SCREENSHOT_CHARS = 200_000; 

/** Truncate long strings so they don't blow the context window. */
export const truncate = (str: string, max = MAX_RETURN_CHARS) =>
  str.length > max
    ? `${str.slice(0, max)}\n… (truncated, total ${str.length} chars)`
    : str;

// Dialog handling utilities
export let lastDialog: Dialog | null = null;

export const resetDialog = () => {
  lastDialog = null;
};

export const installDialogListener = (page: Page) => {
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

// Add missing imports
import type { Page, BrowserContext, Dialog } from "playwright-crx/test";
