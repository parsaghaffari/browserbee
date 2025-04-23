import { UIMessage } from './types';

/**
 * Send a message to the UI
 * @param action The action type
 * @param content The content of the message
 * @param tabId Optional tab ID to include in the message
 */
export function sendUIMessage(action: string, content: any, tabId?: number) {
  // Include the current tab ID in the message if available
  if (tabId) {
    chrome.runtime.sendMessage({ action, content, tabId });
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
