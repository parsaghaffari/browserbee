import { getWindowForTab } from './tabManager';
import { v4 } from "uuid";

/**
 * Send a message to the UI
 * @param action The action type
 * @param content The content of the message
 * @param tabId Optional tab ID to include in the message
 * @param windowId Optional window ID to include in the message
 */
export function sendUIMessage(action: string, content: any, tabId?: number, windowId?: number) {
  // Include the current tab ID and window ID in the message if available
  if (tabId) {
    // Get windowId from tabId if not provided
    if (!windowId) {
      try {
        // Try to get the window ID from the tab manager
        if (typeof getWindowForTab === 'function') {
          windowId = getWindowForTab(tabId);
        }
      } catch (error) {
        // Ignore errors, just proceed without window ID
        console.warn('Could not get window ID for tab:', tabId);
      }
    }
    chrome.runtime.sendMessage({ action, content, tabId, windowId });
  } else {
    chrome.runtime.sendMessage({ action, content });
  }
}

/**
 * Log a message with a timestamp
 * @param message The message to log
 * @param level The log level (log, warn, error)
 */
export function logWithTimestamp(message: string, level: 'log' | 'warn' | 'error' = 'log') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;

  switch (level) {
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
}

/**
 * Handle errors with consistent formatting and logging
 * @param error The error object
 * @param context Additional context about where the error occurred
 * @returns Formatted error message
 */
export function handleError(error: any, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const formattedError = `Error in ${context}: ${errorMessage}`;
  logWithTimestamp(formattedError, 'error');
  return formattedError;
}

/**
 * Wait for a specified amount of time
 * @param ms Time to wait in milliseconds
 * @returns Promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateUuid() {
  return v4();
}
