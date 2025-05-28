import { jest } from '@jest/globals';
import { ErrorHandler } from '../../../src/agent/ErrorHandler';

// Mock navigator for streaming support tests
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

// Mock EventSource for streaming support tests
global.EventSource = jest.fn() as any;

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with cancelled state as false', () => {
      expect(errorHandler.isExecutionCancelled()).toBe(false);
    });

    it('should create a new instance each time', () => {
      const handler1 = new ErrorHandler();
      const handler2 = new ErrorHandler();
      
      expect(handler1).not.toBe(handler2);
      expect(handler1.isExecutionCancelled()).toBe(false);
      expect(handler2.isExecutionCancelled()).toBe(false);
    });
  });

  describe('cancel and resetCancel', () => {
    it('should set cancelled state to true when cancel is called', () => {
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      errorHandler.cancel();
      
      expect(errorHandler.isExecutionCancelled()).toBe(true);
    });

    it('should reset cancelled state to false when resetCancel is called', () => {
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
      
      errorHandler.resetCancel();
      
      expect(errorHandler.isExecutionCancelled()).toBe(false);
    });

    it('should handle multiple cancel and reset cycles', () => {
      // Initial state
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      // First cycle
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
      errorHandler.resetCancel();
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      // Second cycle
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
      errorHandler.resetCancel();
      expect(errorHandler.isExecutionCancelled()).toBe(false);
    });

    it('should handle multiple cancel calls without changing state', () => {
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
      
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
    });

    it('should handle multiple reset calls without changing state', () => {
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      errorHandler.resetCancel();
      expect(errorHandler.isExecutionCancelled()).toBe(false);
    });
  });

  describe('isExecutionCancelled', () => {
    it('should return current cancellation state', () => {
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
      
      errorHandler.resetCancel();
      expect(errorHandler.isExecutionCancelled()).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for rate limit errors', () => {
      const rateLimitError = {
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded'
        }
      };
      
      expect(errorHandler.isRateLimitError(rateLimitError)).toBe(true);
    });

    it('should return false for non-rate limit errors', () => {
      const otherError = {
        error: {
          type: 'other_error',
          message: 'Some other error'
        }
      };
      
      expect(errorHandler.isRateLimitError(otherError)).toBe(false);
    });

    it('should return false for errors without error.type', () => {
      const errorWithoutType = {
        error: {
          message: 'Error without type'
        }
      };
      
      expect(errorHandler.isRateLimitError(errorWithoutType)).toBe(false);
    });

    it('should return false for errors without error property', () => {
      const errorWithoutErrorProp = {
        message: 'Error without error property'
      };
      
      expect(errorHandler.isRateLimitError(errorWithoutErrorProp)).toBe(false);
    });

    it('should return false for null or undefined errors', () => {
      expect(errorHandler.isRateLimitError(null)).toBe(false);
      expect(errorHandler.isRateLimitError(undefined)).toBe(false);
    });

    it('should return false for primitive errors', () => {
      expect(errorHandler.isRateLimitError('string error')).toBe(false);
      expect(errorHandler.isRateLimitError(123)).toBe(false);
      expect(errorHandler.isRateLimitError(true)).toBe(false);
    });
  });

  describe('isOverloadedError', () => {
    it('should return true for overloaded errors', () => {
      const overloadedError = {
        error: {
          type: 'overloaded_error',
          message: 'Servers are overloaded'
        }
      };
      
      expect(errorHandler.isOverloadedError(overloadedError)).toBe(true);
    });

    it('should return false for non-overloaded errors', () => {
      const otherError = {
        error: {
          type: 'other_error',
          message: 'Some other error'
        }
      };
      
      expect(errorHandler.isOverloadedError(otherError)).toBe(false);
    });

    it('should return false for errors without error.type', () => {
      const errorWithoutType = {
        error: {
          message: 'Error without type'
        }
      };
      
      expect(errorHandler.isOverloadedError(errorWithoutType)).toBe(false);
    });

    it('should return false for errors without error property', () => {
      const errorWithoutErrorProp = {
        message: 'Error without error property'
      };
      
      expect(errorHandler.isOverloadedError(errorWithoutErrorProp)).toBe(false);
    });

    it('should return false for null or undefined errors', () => {
      expect(errorHandler.isOverloadedError(null)).toBe(false);
      expect(errorHandler.isOverloadedError(undefined)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for rate limit errors', () => {
      const rateLimitError = {
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded'
        }
      };
      
      expect(errorHandler.isRetryableError(rateLimitError)).toBe(true);
    });

    it('should return true for overloaded errors', () => {
      const overloadedError = {
        error: {
          type: 'overloaded_error',
          message: 'Servers are overloaded'
        }
      };
      
      expect(errorHandler.isRetryableError(overloadedError)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const nonRetryableError = {
        error: {
          type: 'authentication_error',
          message: 'Invalid API key'
        }
      };
      
      expect(errorHandler.isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should return false for errors without proper structure', () => {
      expect(errorHandler.isRetryableError(null)).toBe(false);
      expect(errorHandler.isRetryableError(undefined)).toBe(false);
      expect(errorHandler.isRetryableError('string error')).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format rate limit errors with specific message', () => {
      const rateLimitError = {
        error: {
          type: 'rate_limit_error',
          message: 'You have exceeded your rate limit'
        }
      };
      
      const formatted = errorHandler.formatErrorMessage(rateLimitError);
      
      expect(formatted).toBe('Rate limit error: You have exceeded your rate limit');
    });

    it('should format overloaded errors with specific message', () => {
      const overloadedError = {
        error: {
          type: 'overloaded_error',
          message: 'Our servers are experiencing high load'
        }
      };
      
      const formatted = errorHandler.formatErrorMessage(overloadedError);
      
      expect(formatted).toBe('Anthropic servers overloaded: Our servers are experiencing high load. Retrying...');
    });

    it('should format Error objects with their message', () => {
      const error = new Error('Something went wrong');
      
      const formatted = errorHandler.formatErrorMessage(error);
      
      expect(formatted).toBe('Error: Something went wrong');
    });

    it('should format string errors', () => {
      const stringError = 'String error message';
      
      const formatted = errorHandler.formatErrorMessage(stringError);
      
      expect(formatted).toBe('Error: String error message');
    });

    it('should format object errors without specific type', () => {
      const objectError = {
        error: {
          type: 'unknown_error',
          message: 'Unknown error occurred'
        }
      };
      
      const formatted = errorHandler.formatErrorMessage(objectError);
      
      expect(formatted).toBe('Error: [object Object]');
    });

    it('should format null and undefined errors', () => {
      expect(errorHandler.formatErrorMessage(null)).toBe('Error: null');
      expect(errorHandler.formatErrorMessage(undefined)).toBe('Error: undefined');
    });

    it('should format number errors', () => {
      expect(errorHandler.formatErrorMessage(404)).toBe('Error: 404');
    });

    it('should format boolean errors', () => {
      expect(errorHandler.formatErrorMessage(false)).toBe('Error: false');
    });
  });

  describe('calculateBackoffTime', () => {
    it('should calculate base backoff time for first attempt', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      const backoffTime = errorHandler.calculateBackoffTime(error, 0);
      
      // Should be around 1000ms (base) + jitter (up to 250ms)
      expect(backoffTime).toBeGreaterThanOrEqual(1000);
      expect(backoffTime).toBeLessThanOrEqual(1250);
    });

    it('should calculate longer backoff time for overloaded errors', () => {
      const overloadedError = { error: { type: 'overloaded_error' } };
      
      const backoffTime = errorHandler.calculateBackoffTime(overloadedError, 0);
      
      // Should be around 2000ms (base) + jitter (up to 500ms)
      expect(backoffTime).toBeGreaterThanOrEqual(2000);
      expect(backoffTime).toBeLessThanOrEqual(2500);
    });

    it('should use exponential backoff for multiple retry attempts', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      const backoff0 = errorHandler.calculateBackoffTime(error, 0);
      const backoff1 = errorHandler.calculateBackoffTime(error, 1);
      const backoff2 = errorHandler.calculateBackoffTime(error, 2);
      
      // Each should be roughly double the previous (with jitter)
      expect(backoff1).toBeGreaterThan(backoff0 * 1.5); // Account for jitter
      expect(backoff2).toBeGreaterThan(backoff1 * 1.5);
    });

    it('should cap exponential backoff at attempt 5', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      const backoff5 = errorHandler.calculateBackoffTime(error, 5);
      const backoff10 = errorHandler.calculateBackoffTime(error, 10);
      
      // Both should use the same exponential factor (2^5)
      // Allow for jitter variation
      expect(Math.abs(backoff10 - backoff5)).toBeLessThan(backoff5 * 0.3);
    });

    it('should handle default retry attempt parameter', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      const backoffDefault = errorHandler.calculateBackoffTime(error);
      const backoff0 = errorHandler.calculateBackoffTime(error, 0);
      
      // Should be similar (both use attempt 0)
      expect(Math.abs(backoffDefault - backoff0)).toBeLessThan(500); // Allow for jitter
    });

    it('should handle negative retry attempts', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      const backoffNegative = errorHandler.calculateBackoffTime(error, -1);
      
      // Should still work (Math.pow handles negative numbers)
      expect(backoffNegative).toBeGreaterThan(0);
    });

    it('should add jitter to prevent thundering herd', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      // Calculate multiple backoff times for the same attempt
      const backoffs = Array.from({ length: 10 }, () => 
        errorHandler.calculateBackoffTime(error, 1)
      );
      
      // They should not all be exactly the same due to jitter
      const uniqueValues = new Set(backoffs);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

    it('should handle non-retryable errors with default backoff', () => {
      const error = { error: { type: 'authentication_error' } };
      
      const backoffTime = errorHandler.calculateBackoffTime(error, 0);
      
      // Should use base backoff (1000ms) + jitter
      expect(backoffTime).toBeGreaterThanOrEqual(1000);
      expect(backoffTime).toBeLessThanOrEqual(1250);
    });

    it('should return integer values', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      const backoffTime = errorHandler.calculateBackoffTime(error, 2);
      
      expect(Number.isInteger(backoffTime)).toBe(true);
    });
  });

  describe('isStreamingSupported', () => {
    beforeEach(() => {
      // Reset EventSource mock
      global.EventSource = jest.fn() as any;
      
      // Reset navigator mock
      Object.defineProperty(global, 'navigator', {
        value: { ...mockNavigator },
        writable: true
      });
    });

    it('should return true when EventSource is supported and browser is compatible', async () => {
      const isSupported = await errorHandler.isStreamingSupported();
      
      expect(isSupported).toBe(true);
    });

    it('should return false when EventSource is not supported', async () => {
      // Remove EventSource
      delete (global as any).EventSource;
      
      const isSupported = await errorHandler.isStreamingSupported();
      
      expect(isSupported).toBe(false);
    });

    it('should return false for problematic browsers', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'problematic-browser' },
        writable: true
      });
      
      const isSupported = await errorHandler.isStreamingSupported();
      
      expect(isSupported).toBe(false);
    });

    it('should handle missing navigator gracefully', async () => {
      delete (global as any).navigator;
      
      const isSupported = await errorHandler.isStreamingSupported();
      
      expect(isSupported).toBe(false);
    });

    it('should handle different browser user agents correctly', async () => {
      const testCases = [
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          expected: true
        },
        {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          expected: true
        },
        {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          expected: true
        },
        {
          userAgent: 'problematic-browser/1.0',
          expected: false
        }
      ];
      
      for (const testCase of testCases) {
        Object.defineProperty(global, 'navigator', {
          value: { userAgent: testCase.userAgent },
          writable: true
        });
        
        const isSupported = await errorHandler.isStreamingSupported();
        expect(isSupported).toBe(testCase.expected);
      }
    });

    it('should handle undefined EventSource', async () => {
      global.EventSource = undefined as any;
      
      const isSupported = await errorHandler.isStreamingSupported();
      
      expect(isSupported).toBe(false);
    });

    it('should handle basic streaming support scenarios', async () => {
      // Test basic scenarios without complex mocking
      
      // Test with valid EventSource and navigator
      global.EventSource = jest.fn() as any;
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 Chrome/91.0' },
        writable: true
      });
      
      let isSupported = await errorHandler.isStreamingSupported();
      expect(isSupported).toBe(true);
      
      // Test with missing EventSource
      delete (global as any).EventSource;
      isSupported = await errorHandler.isStreamingSupported();
      expect(isSupported).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete error handling workflow', () => {
      // Start with clean state
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      // Simulate error handling workflow
      const rateLimitError = {
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded'
        }
      };
      
      // Check error type
      expect(errorHandler.isRetryableError(rateLimitError)).toBe(true);
      
      // Format error message
      const message = errorHandler.formatErrorMessage(rateLimitError);
      expect(message).toContain('Rate limit error');
      
      // Calculate backoff time
      const backoffTime = errorHandler.calculateBackoffTime(rateLimitError, 1);
      expect(backoffTime).toBeGreaterThan(1000);
      
      // Cancel execution if needed
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
      
      // Reset for retry
      errorHandler.resetCancel();
      expect(errorHandler.isExecutionCancelled()).toBe(false);
    });

    it('should handle multiple error types in sequence', () => {
      const errors = [
        { error: { type: 'rate_limit_error', message: 'Rate limited' } },
        { error: { type: 'overloaded_error', message: 'Overloaded' } },
        { error: { type: 'authentication_error', message: 'Auth failed' } }
      ];
      
      const results = errors.map(error => ({
        isRetryable: errorHandler.isRetryableError(error),
        message: errorHandler.formatErrorMessage(error),
        backoffTime: errorHandler.calculateBackoffTime(error, 0)
      }));
      
      // Rate limit error
      expect(results[0].isRetryable).toBe(true);
      expect(results[0].message).toContain('Rate limit error');
      
      // Overloaded error
      expect(results[1].isRetryable).toBe(true);
      expect(results[1].message).toContain('Anthropic servers overloaded');
      expect(results[1].backoffTime).toBeGreaterThan(results[0].backoffTime);
      
      // Authentication error
      expect(results[2].isRetryable).toBe(false);
      expect(results[2].message).toContain('Error:');
    });

    it('should maintain state consistency across operations', () => {
      // Initial state
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      // Multiple operations
      errorHandler.cancel();
      expect(errorHandler.isExecutionCancelled()).toBe(true);
      
      // Error checking should still work when cancelled
      const error = { error: { type: 'rate_limit_error' } };
      expect(errorHandler.isRetryableError(error)).toBe(true);
      
      // Reset and continue
      errorHandler.resetCancel();
      expect(errorHandler.isExecutionCancelled()).toBe(false);
      
      // All functions should still work
      expect(errorHandler.formatErrorMessage(error)).toContain('Rate limit error');
      expect(errorHandler.calculateBackoffTime(error)).toBeGreaterThan(0);
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle malformed error objects gracefully', () => {
      const malformedErrors = [
        { error: null },
        { error: undefined },
        { error: 'string' },
        { error: 123 },
        { error: [] },
        { error: { type: null } },
        { error: { type: undefined } },
        { error: { type: 123 } }
      ];
      
      malformedErrors.forEach(error => {
        expect(() => {
          errorHandler.isRateLimitError(error);
          errorHandler.isOverloadedError(error);
          errorHandler.isRetryableError(error);
          errorHandler.formatErrorMessage(error);
          errorHandler.calculateBackoffTime(error);
        }).not.toThrow();
      });
    });

    it('should handle extreme retry attempt values', () => {
      const error = { error: { type: 'rate_limit_error' } };
      
      // Very large retry attempt
      const largeBackoff = errorHandler.calculateBackoffTime(error, 1000);
      expect(largeBackoff).toBeGreaterThan(0);
      expect(Number.isFinite(largeBackoff)).toBe(true);
      
      // Negative retry attempt
      const negativeBackoff = errorHandler.calculateBackoffTime(error, -5);
      expect(negativeBackoff).toBeGreaterThan(0);
      
      // Zero retry attempt
      const zeroBackoff = errorHandler.calculateBackoffTime(error, 0);
      expect(zeroBackoff).toBeGreaterThan(0);
    });

    it('should handle concurrent cancellation operations', () => {
      // Simulate concurrent operations
      const operations = Array.from({ length: 10 }, () => {
        if (Math.random() > 0.5) {
          errorHandler.cancel();
        } else {
          errorHandler.resetCancel();
        }
        return errorHandler.isExecutionCancelled();
      });
      
      // Should always return a boolean
      operations.forEach(result => {
        expect(typeof result).toBe('boolean');
      });
      
      // Final state should be deterministic
      const finalState = errorHandler.isExecutionCancelled();
      expect(typeof finalState).toBe('boolean');
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive calls efficiently', () => {
      const startTime = Date.now();
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        errorHandler.cancel();
        errorHandler.resetCancel();
        errorHandler.isExecutionCancelled();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms for 1000 operations)
      expect(duration).toBeLessThan(100);
    });

    it('should handle many error classifications efficiently', () => {
      const errors = Array.from({ length: 100 }, (_, i) => ({
        error: {
          type: i % 3 === 0 ? 'rate_limit_error' : 
                i % 3 === 1 ? 'overloaded_error' : 'other_error',
          message: `Error ${i}`
        }
      }));
      
      const startTime = Date.now();
      
      errors.forEach(error => {
        errorHandler.isRetryableError(error);
        errorHandler.formatErrorMessage(error);
        errorHandler.calculateBackoffTime(error, 1);
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly
      expect(duration).toBeLessThan(50);
    });
  });
});
