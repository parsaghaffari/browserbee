import type { Page, Dialog } from "playwright-crx";
import { getCurrentPage } from "../PageContextManager";

// Constants for output size limits
export const MAX_RETURN_CHARS = 20000;
export const MAX_SCREENSHOT_CHARS = 500000;

/**
 * Helper function to execute a function with the active page from PageContextManager
 * @param page The original page reference
 * @param fn The function to execute with the active page
 * @returns The result of the function
 */
export async function withActivePage<T>(
  page: Page, 
  fn: (activePage: Page) => Promise<T>
): Promise<T> {
  // Get the current active page from PageContextManager
  const activePage = getCurrentPage(page);
  
  // Execute the function with the active page
  return await fn(activePage);
}

/**
 * Truncate a string to a maximum length
 * @param str The string to truncate
 * @param maxLength The maximum length (default: MAX_RETURN_CHARS)
 * @returns The truncated string
 */
export function truncate(str: string, maxLength: number = MAX_RETURN_CHARS): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + `\n\n[Truncated ${str.length - maxLength} characters]`;
}

// Dialog handling
export let lastDialog: Dialog | null = null;

export function resetDialog() {
  lastDialog = null;
}

export function installDialogListener(page: Page) {
  // Get the active page
  const activePage = getCurrentPage(page);
  
  // Install the dialog listener on the active page
  activePage.on("dialog", dialog => {
    lastDialog = dialog;
  });
}
