/**
 * ErrorHandler handles cancellation logic, error recovery, and rate limit handling.
 */
export class ErrorHandler {
  private isCancelled: boolean = false;
  
  constructor() {
    this.resetCancel();
  }
  
  /**
   * Cancel the current execution
   */
  cancel(): void {
    this.isCancelled = true;
  }
  
  /**
   * Reset the cancel flag
   */
  resetCancel(): void {
    this.isCancelled = false;
  }
  
  /**
   * Check if the execution has been cancelled
   */
  isExecutionCancelled(): boolean {
    return this.isCancelled;
  }
  
  /**
   * Check if an error is a rate limit error
   */
  isRateLimitError(error: any): boolean {
    return error?.error?.type === 'rate_limit_error';
  }
  
  /**
   * Format an error message for display
   */
  formatErrorMessage(error: any): string {
    if (this.isRateLimitError(error)) {
      return `Rate limit error: ${error.error.message}`;
    }
    
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
  
  /**
   * Check if streaming is supported in the current environment
   */
  async isStreamingSupported(): Promise<boolean> {
    try {
      // Check if the browser supports the necessary features for streaming
      const supportsEventSource = typeof EventSource !== 'undefined';
      
      // We could also check for any browser-specific limitations
      const isCompatibleBrowser = !navigator.userAgent.includes('problematic-browser');
      
      return supportsEventSource && isCompatibleBrowser;
    } catch (error) {
      console.warn("Error checking streaming support:", error);
      return false;
    }
  }
}
