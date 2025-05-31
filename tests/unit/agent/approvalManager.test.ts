import { jest } from '@jest/globals';

// Mock the tabManager dependency before importing approvalManager
jest.mock('../../../src/background/tabManager', () => ({
  getWindowForTab: jest.fn()
}));

// Define proper types for Chrome API mocks
interface MockChromeRuntime {
  sendMessage: jest.MockedFunction<any>;
  lastError: { message: string } | null;
}

interface MockChrome {
  runtime: MockChromeRuntime;
}

// Mock Chrome APIs with proper typing
const mockChrome: MockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  }
};

Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

// Import after mocking
import { requestApproval, handleApprovalResponse } from '../../../src/agent/approvalManager';
import { getWindowForTab } from '../../../src/background/tabManager';

// Type the mocked function
const mockGetWindowForTab = getWindowForTab as jest.MockedFunction<typeof getWindowForTab>;

describe('approvalManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.runtime.lastError = null;
    mockChrome.runtime.sendMessage.mockClear();
    mockGetWindowForTab.mockClear();
  });

  describe('requestApproval', () => {
    it('should request approval and resolve with true when approved', async () => {
      const tabId = 123;
      const toolName = 'browser_click';
      const toolInput = 'button[type="submit"]';
      const reason = 'Clicking submit button';
      const windowId = 456;

      // Mock successful message sending
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        // Simulate async response
        setTimeout(() => {
          if (callback) callback({});
        }, 0);
        return true;
      });

      // Start the approval request
      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason, windowId);

      // Wait a moment for the message to be sent
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify the message was sent correctly
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'requestApproval',
          tabId,
          windowId,
          requestId: expect.stringMatching(/^approval_\d+_[a-z0-9]+$/),
          toolName,
          toolInput,
          reason
        },
        expect.any(Function)
      );

      // Get the request ID from the sent message
      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      const requestId = sentMessage.requestId;

      // Simulate approval response
      handleApprovalResponse(requestId, true);

      // Wait for the promise to resolve
      const result = await approvalPromise;
      expect(result).toBe(true);
    });

    it('should request approval and resolve with false when rejected', async () => {
      const tabId = 123;
      const toolName = 'browser_navigate';
      const toolInput = 'https://example.com';
      const reason = 'Navigating to external site';

      // Mock successful message sending
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Start the approval request
      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      // Wait for message to be sent
      await new Promise(resolve => setTimeout(resolve, 10));

      // Get the request ID and simulate rejection
      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      const requestId = sentMessage.requestId;

      handleApprovalResponse(requestId, false);

      const result = await approvalPromise;
      expect(result).toBe(false);
    });

    it('should get window ID from tabManager when not provided', async () => {
      const tabId = 123;
      const toolName = 'browser_type';
      const toolInput = 'Hello World';
      const reason = 'Typing text';
      const expectedWindowId = 789;

      // Mock tabManager to return window ID
      mockGetWindowForTab.mockReturnValue(expectedWindowId);

      // Mock successful message sending
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Start approval request without window ID
      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify tabManager was called
      expect(mockGetWindowForTab).toHaveBeenCalledWith(tabId);

      // Verify message includes the window ID from tabManager
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          windowId: expectedWindowId
        }),
        expect.any(Function)
      );

      // Complete the approval
      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      handleApprovalResponse(sentMessage.requestId, true);

      await approvalPromise;
    });

    it('should handle tabManager errors gracefully', async () => {
      const tabId = 123;
      const toolName = 'browser_click';
      const toolInput = 'button';
      const reason = 'Test click';

      // Mock tabManager to throw error
      mockGetWindowForTab.mockImplementation(() => {
        throw new Error('Tab not found');
      });

      // Mock console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock successful message sending
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting window ID for tab:',
        expect.any(Error)
      );

      // Verify message was still sent (without window ID)
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tabId,
          windowId: undefined
        }),
        expect.any(Function)
      );

      // Complete the approval
      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      handleApprovalResponse(sentMessage.requestId, true);

      await approvalPromise;
      consoleSpy.mockRestore();
    });

    it('should resolve with false when chrome.runtime.sendMessage fails', async () => {
      const tabId = 123;
      const toolName = 'browser_click';
      const toolInput = 'button';
      const reason = 'Test click';

      // Mock runtime error
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return false;
      });

      const result = await requestApproval(tabId, toolName, toolInput, reason);

      expect(result).toBe(false);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should generate unique request IDs', async () => {
      const tabId = 123;
      const toolName = 'browser_click';
      const toolInput = 'button';
      const reason = 'Test click';

      // Mock successful message sending
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Make multiple requests
      const promises = [
        requestApproval(tabId, toolName, toolInput, reason),
        requestApproval(tabId + 1, toolName, toolInput, reason),
        requestApproval(tabId + 2, toolName, toolInput, reason)
      ];

      await new Promise(resolve => setTimeout(resolve, 10));

      // Get all request IDs
      const requestIds = mockChrome.runtime.sendMessage.mock.calls.map(
        call => (call[0] as any).requestId
      );

      // Verify all IDs are unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(3);

      // Verify ID format
      requestIds.forEach(id => {
        expect(id).toMatch(/^approval_\d+_[a-z0-9]+$/);
      });

      // Complete all approvals
      requestIds.forEach((id, index) => {
        handleApprovalResponse(id, index % 2 === 0);
      });

      await Promise.all(promises);
    });

    it('should handle multiple concurrent approval requests', async () => {
      const requests = [
        { tabId: 1, toolName: 'browser_click', toolInput: 'button1', reason: 'Click 1' },
        { tabId: 2, toolName: 'browser_type', toolInput: 'text1', reason: 'Type 1' },
        { tabId: 3, toolName: 'browser_navigate', toolInput: 'url1', reason: 'Navigate 1' }
      ];

      // Mock successful message sending
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Start all requests concurrently
      const promises = requests.map(req =>
        requestApproval(req.tabId, req.toolName, req.toolInput, req.reason)
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify all messages were sent
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(3);

      // Get request IDs and approve them with different responses
      const requestIds = mockChrome.runtime.sendMessage.mock.calls.map(
        call => (call[0] as any).requestId
      );

      // Approve first and third, reject second
      handleApprovalResponse(requestIds[0], true);
      handleApprovalResponse(requestIds[1], false);
      handleApprovalResponse(requestIds[2], true);

      const results = await Promise.all(promises);
      expect(results).toEqual([true, false, true]);
    });

    it('should include all required fields in approval message', async () => {
      const tabId = 456;
      const toolName = 'browser_screenshot';
      const toolInput = '';
      const reason = 'Taking screenshot for analysis';
      const windowId = 789;

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason, windowId);

      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;

      expect(sentMessage).toEqual({
        action: 'requestApproval',
        tabId,
        windowId,
        requestId: expect.stringMatching(/^approval_\d+_[a-z0-9]+$/),
        toolName,
        toolInput,
        reason
      });

      // Complete the approval
      handleApprovalResponse(sentMessage.requestId, true);
      await approvalPromise;
    });

    it('should handle empty and special characters in inputs', async () => {
      const testCases = [
        {
          toolName: 'browser_type',
          toolInput: '',
          reason: 'Empty input test'
        },
        {
          toolName: 'browser_click',
          toolInput: 'button[data-test="special-chars-!@#$%^&*()"]',
          reason: 'Special characters in selector'
        },
        {
          toolName: 'browser_navigate',
          toolInput: 'https://example.com/path?param=value&other=123',
          reason: 'URL with parameters'
        },
        {
          toolName: 'browser_type',
          toolInput: 'Text with\nnewlines\tand\ttabs',
          reason: 'Text with whitespace characters'
        }
      ];

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      for (const testCase of testCases) {
        const approvalPromise = requestApproval(
          123,
          testCase.toolName,
          testCase.toolInput,
          testCase.reason
        );

        await new Promise(resolve => setTimeout(resolve, 10));

        const sentMessage = mockChrome.runtime.sendMessage.mock.calls[
          mockChrome.runtime.sendMessage.mock.calls.length - 1
        ][0] as any;

        expect(sentMessage.toolName).toBe(testCase.toolName);
        expect(sentMessage.toolInput).toBe(testCase.toolInput);
        expect(sentMessage.reason).toBe(testCase.reason);

        // Complete the approval
        handleApprovalResponse(sentMessage.requestId, true);
        await approvalPromise;
      }
    });
  });

  describe('handleApprovalResponse', () => {
    it('should resolve pending approval with true when approved', async () => {
      const tabId = 123;
      const toolName = 'browser_click';
      const toolInput = 'button';
      const reason = 'Test approval';

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      const requestId = sentMessage.requestId;

      // Handle approval
      handleApprovalResponse(requestId, true);

      const result = await approvalPromise;
      expect(result).toBe(true);
    });

    it('should resolve pending approval with false when rejected', async () => {
      const tabId = 123;
      const toolName = 'browser_navigate';
      const toolInput = 'https://malicious-site.com';
      const reason = 'Suspicious navigation';

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      const requestId = sentMessage.requestId;

      // Handle rejection
      handleApprovalResponse(requestId, false);

      const result = await approvalPromise;
      expect(result).toBe(false);
    });

    it('should handle non-existent request ID gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to handle response for non-existent request
      handleApprovalResponse('non-existent-id', true);

      expect(consoleSpy).toHaveBeenCalledWith(
        'No pending approval found for requestId: non-existent-id'
      );

      consoleSpy.mockRestore();
    });

    it('should handle multiple responses to same request ID', async () => {
      const tabId = 123;
      const toolName = 'browser_click';
      const toolInput = 'button';
      const reason = 'Test';

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      const requestId = sentMessage.requestId;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // First response should work
      handleApprovalResponse(requestId, true);
      const result = await approvalPromise;
      expect(result).toBe(true);

      // Second response should log warning
      handleApprovalResponse(requestId, false);
      expect(consoleSpy).toHaveBeenCalledWith(
        `No pending approval found for requestId: ${requestId}`
      );

      consoleSpy.mockRestore();
    });

    it('should handle rapid successive responses', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        tabId: i + 1,
        toolName: 'browser_click',
        toolInput: `button${i}`,
        reason: `Test ${i}`
      }));

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Start all requests
      const promises = requests.map(req =>
        requestApproval(req.tabId, req.toolName, req.toolInput, req.reason)
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // Get all request IDs
      const requestIds = mockChrome.runtime.sendMessage.mock.calls.map(
        call => (call[0] as any).requestId
      );

      // Respond to all rapidly
      requestIds.forEach((id, index) => {
        handleApprovalResponse(id, index % 2 === 0);
      });

      const results = await Promise.all(promises);
      expect(results).toEqual([true, false, true, false, true]);
    });

    it('should clean up pending approval after response', async () => {
      const tabId = 123;
      const toolName = 'browser_type';
      const toolInput = 'test text';
      const reason = 'Testing cleanup';

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      const requestId = sentMessage.requestId;

      // Handle approval
      handleApprovalResponse(requestId, true);
      await approvalPromise;

      // Try to handle the same request again - should warn about not found
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      handleApprovalResponse(requestId, false);

      expect(consoleSpy).toHaveBeenCalledWith(
        `No pending approval found for requestId: ${requestId}`
      );

      consoleSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete approval workflow', async () => {
      const tabId = 123;
      const toolName = 'browser_navigate';
      const toolInput = 'https://external-site.com';
      const reason = 'User requested navigation to external site';
      const windowId = 456;

      mockGetWindowForTab.mockReturnValue(windowId);
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Start approval request
      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      // Verify message was sent
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'requestApproval',
          tabId,
          windowId,
          toolName,
          toolInput,
          reason
        }),
        expect.any(Function)
      );

      // Simulate user approval
      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      handleApprovalResponse(sentMessage.requestId, true);

      // Verify approval result
      const result = await approvalPromise;
      expect(result).toBe(true);
    });

    it('should handle approval timeout scenario', async () => {
      const tabId = 123;
      const toolName = 'browser_click';
      const toolInput = 'button';
      const reason = 'Test timeout';

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Start approval request but don't respond
      const approvalPromise = requestApproval(tabId, toolName, toolInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify message was sent
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();

      // The promise should remain pending since we don't respond
      // In a real scenario, there might be a timeout mechanism
      let resolved = false;
      approvalPromise.then(() => { resolved = true; });

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(resolved).toBe(false);

      // Now respond and verify it resolves
      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      handleApprovalResponse(sentMessage.requestId, true);

      await approvalPromise;
      expect(resolved).toBe(true);
    });

    it('should handle extension context invalidation', async () => {
      const tabId = 123;
      const toolName = 'browser_type';
      const toolInput = 'sensitive data';
      const reason = 'Entering sensitive information';

      // Mock extension context invalidation
      mockChrome.runtime.lastError = {
        message: 'Extension context invalidated.'
      };
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return false;
      });

      const result = await requestApproval(tabId, toolName, toolInput, reason);

      expect(result).toBe(false);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should handle mixed approval and rejection responses', async () => {
      const requests = [
        { tabId: 1, toolName: 'browser_click', approved: true },
        { tabId: 2, toolName: 'browser_navigate', approved: false },
        { tabId: 3, toolName: 'browser_type', approved: true },
        { tabId: 4, toolName: 'browser_screenshot', approved: false }
      ];

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Start all requests
      const promises = requests.map(req =>
        requestApproval(req.tabId, req.toolName, 'test input', 'test reason')
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // Get request IDs and respond accordingly
      const requestIds = mockChrome.runtime.sendMessage.mock.calls.map(
        call => (call[0] as any).requestId
      );

      requestIds.forEach((id, index) => {
        handleApprovalResponse(id, requests[index].approved);
      });

      const results = await Promise.all(promises);
      expect(results).toEqual([true, false, true, false]);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed request IDs', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const malformedIds = [
        '',
        null as any,
        undefined as any,
        123 as any,
        {} as any,
        'invalid-format'
      ];

      malformedIds.forEach(id => {
        handleApprovalResponse(id, true);
        expect(consoleSpy).toHaveBeenCalledWith(
          `No pending approval found for requestId: ${id}`
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle Chrome API unavailability', async () => {
      // Temporarily remove chrome API
      const originalChrome = global.chrome;
      delete (global as any).chrome;

      // This should throw an error since chrome is not available
      await expect(
        requestApproval(123, 'browser_click', 'button', 'test')
      ).rejects.toThrow();

      // Restore chrome API
      Object.defineProperty(global, 'chrome', {
        value: originalChrome,
        writable: true
      });
    });

    it('should handle very long input strings', async () => {
      const tabId = 123;
      const toolName = 'browser_type';
      const longInput = 'a'.repeat(10000); // Very long string
      const reason = 'Testing long input handling';

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, longInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      expect(sentMessage.toolInput).toBe(longInput);
      expect(sentMessage.toolInput.length).toBe(10000);

      handleApprovalResponse(sentMessage.requestId, true);
      const result = await approvalPromise;
      expect(result).toBe(true);
    });

    it('should handle Unicode and special characters', async () => {
      const tabId = 123;
      const toolName = 'browser_type';
      const unicodeInput = '🚀 Hello 世界 🌍 Émojis & Ñiño';
      const reason = 'Testing Unicode support';

      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const approvalPromise = requestApproval(tabId, toolName, unicodeInput, reason);

      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = mockChrome.runtime.sendMessage.mock.calls[0][0] as any;
      expect(sentMessage.toolInput).toBe(unicodeInput);

      handleApprovalResponse(sentMessage.requestId, true);
      const result = await approvalPromise;
      expect(result).toBe(true);
    });

    it('should handle rapid request creation and cancellation', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Create many requests rapidly
      const promises = Array.from({ length: 100 }, (_, i) =>
        requestApproval(i, 'browser_click', `button${i}`, `reason${i}`)
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // Get all request IDs
      const requestIds = mockChrome.runtime.sendMessage.mock.calls.map(
        call => (call[0] as any).requestId
      );

      // Respond to all rapidly
      requestIds.forEach((id, index) => {
        handleApprovalResponse(id, index % 3 === 0); // Approve every 3rd
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);

      // Verify pattern of approvals
      results.forEach((result, index) => {
        expect(result).toBe(index % 3 === 0);
      });
    });
  });

  describe('memory and performance', () => {
    it('should not leak memory with many approval requests', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      // Create and resolve many approval requests
      for (let i = 0; i < 1000; i++) {
        const approvalPromise = requestApproval(i, 'browser_click', 'button', 'test');

        await new Promise(resolve => setTimeout(resolve, 1));

        const sentMessage = mockChrome.runtime.sendMessage.mock.calls[
          mockChrome.runtime.sendMessage.mock.calls.length - 1
        ][0] as any;

        handleApprovalResponse(sentMessage.requestId, true);
        await approvalPromise;
      }

      // All requests should have been cleaned up
      // We can't directly test the internal map, but we can verify
      // that handling a non-existent ID still warns
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      handleApprovalResponse('non-existent', true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    }, 30_000);

    it('should handle concurrent requests efficiently', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message: any, callback?: (response: any) => void) => {
        if (callback) callback({});
        return true;
      });

      const startTime = Date.now();

      // Create 50 concurrent requests
      const promises = Array.from({ length: 50 }, (_, i) =>
        requestApproval(i, 'browser_click', `button${i}`, `reason${i}`)
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // Respond to all
      const requestIds = mockChrome.runtime.sendMessage.mock.calls.map(
        call => (call[0] as any).requestId
      );

      requestIds.forEach(id => {
        handleApprovalResponse(id, true);
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 1 second for 50 requests)
      expect(duration).toBeLessThan(1000);
    });
  });
});
