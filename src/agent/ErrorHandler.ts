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
   * Check if an error is an overloaded error
   */
  isOverloadedError(error: any): boolean {
    return error?.error?.type === 'overloaded_error';
  }
  
  /**
   * Check if an error is a retryable error (rate limit or overloaded)
   */
  isRetryableError(error: any): boolean {
    return this.isRateLimitError(error) || this.isOverloadedError(error);
  }
  
  /**
   * Format an error message for display
   */
  formatErrorMessage(error: any): string {
    if (this.isRateLimitError(error)) {
      return `Rate limit error: ${error.error.message}`;
    }
    
    if (this.isOverloadedError(error)) {
      return `Anthropic servers overloaded: ${error.error.message}. Retrying...`;
    }
    
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
  
  /**
   * Calculate backoff time for retries based on error type and retry attempt
   * @param error The error that occurred
   * @param retryAttempt The current retry attempt (0-based)
   * @returns Time to wait in milliseconds before retrying
   */
  calculateBackoffTime(error: any, retryAttempt: number = 0): number {
    // Base backoff time
    let baseBackoff = 1000; // 1 second
    
    // For overloaded errors, use a longer base backoff
    if (this.isOverloadedError(error)) {
      baseBackoff = 2000; // 2 seconds
    }
    
    // Exponential backoff with jitter
    // 2^retryAttempt * baseBackoff + random jitter (up to 25%)
    const exponentialPart = Math.pow(2, Math.min(retryAttempt, 5)) * baseBackoff;
    const jitter = Math.random() * 0.25 * exponentialPart;
    
    return Math.floor(exponentialPart + jitter);
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
