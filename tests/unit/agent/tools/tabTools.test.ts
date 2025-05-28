import { jest } from '@jest/globals';
import { createMockPage, mockChromeAPIs, mockPageContextManager } from '../../../mocks/playwright';

// Mock dependencies before importing the tools
jest.mock('../../../../src/agent/PageContextManager', () => mockPageContextManager);

// Mock Chrome APIs
global.chrome = mockChromeAPIs as any;

// Mock the utils module
jest.mock('../../../../src/agent/tools/utils', () => ({
  getCurrentTabId: jest.fn() as jest.MockedFunction<any>,
}));

// Mock the tab manager
const mockTabManager = {
  createNewTab: jest.fn() as jest.MockedFunction<any>,
  getWindowForTab: jest.fn() as jest.MockedFunction<any>,
  getCrxAppForTab: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('../../../../src/background/tabManager', () => ({
  createNewTab: mockTabManager.createNewTab,
  getWindowForTab: mockTabManager.getWindowForTab,
  getCrxAppForTab: mockTabManager.getCrxAppForTab,
}));

// Mock the page context manager
const mockSetCurrentPage = jest.fn();
jest.mock('../../../../src/agent/PageContextManager', () => ({
  ...mockPageContextManager,
  setCurrentPage: mockSetCurrentPage,
}));

// Import the tools after mocking dependencies
import {
  browserTabList,
  browserTabNew,
  browserTabSelect,
  browserTabClose
} from '../../../../src/agent/tools/tabTools';

describe('Tab Tools', () => {
  let mockPage: any;
  let mockContext: any;
  let mockPages: any[];

  beforeEach(() => {
    mockPage = createMockPage();
    mockPages = [mockPage];
    
    mockContext = {
      pages: jest.fn().mockReturnValue(mockPages)
    };
    
    mockPage.context.mockReturnValue(mockContext);
    mockPage.url.mockReturnValue('https://example.com');
    mockPage.title.mockReturnValue('Example Page');
    
    jest.clearAllMocks();
    
    // Reset mock implementations
    const { getCurrentTabId } = require('../../../../src/agent/tools/utils');
    getCurrentTabId.mockResolvedValue(123);
    mockTabManager.createNewTab.mockResolvedValue(456);
    mockTabManager.getWindowForTab.mockReturnValue(1);
    mockTabManager.getCrxAppForTab.mockResolvedValue({ context: () => mockContext });
  });

  describe('browserTabList', () => {
    it('should list open tabs with indexes and URLs', async () => {
      const tool = browserTabList(mockPage);
      
      // Setup multiple pages
      const mockPage2 = createMockPage();
      mockPage2.url.mockReturnValue('https://google.com');
      mockPages.push(mockPage2);
      
      const result = await tool.func('');

      expect(result).toBe('0: https://example.com\n1: https://google.com');
    });

    it('should handle blank tabs', async () => {
      const tool = browserTabList(mockPage);
      mockPage.url.mockReturnValue('');

      const result = await tool.func('');

      expect(result).toBe('0: <blank>');
    });

    it('should handle no tabs', async () => {
      const tool = browserTabList(mockPage);
      mockPages.length = 0;

      const result = await tool.func('');

      expect(result).toBe('No tabs.');
    });

    it('should handle errors gracefully', async () => {
      const tool = browserTabList(mockPage);
      mockPage.context.mockImplementation(() => {
        throw new Error('Context error');
      });

      const result = await tool.func('');

      expect(result).toBe('Error listing tabs: Context error');
    });

    it('should handle multiple tabs with various URLs', async () => {
      const tool = browserTabList(mockPage);
      
      const mockPage2 = createMockPage();
      const mockPage3 = createMockPage();
      
      mockPage.url.mockReturnValue('https://example.com');
      mockPage2.url.mockReturnValue('https://github.com');
      mockPage3.url.mockReturnValue('');
      
      mockPages.push(mockPage2, mockPage3);

      const result = await tool.func('');

      expect(result).toBe('0: https://example.com\n1: https://github.com\n2: <blank>');
    });
  });

  describe('browserTabNew', () => {
    it('should create a new tab without URL', async () => {
      const tool = browserTabNew(mockPage);
      
      // Mock the new page
      const mockNewPage = createMockPage();
      mockNewPage.title.mockResolvedValue('New Tab');
      mockNewPage.url.mockReturnValue('about:blank');
      mockPages.push(mockNewPage);

      const result = await tool.func('');

      expect(mockTabManager.createNewTab).toHaveBeenCalledWith(1, undefined);
      expect(result).toContain('Opened new tab (#1) in window 1');
      expect(result).toContain('To interact with this tab, use browser_tab_select with index 1');
    });

    it('should create a new tab with URL', async () => {
      const tool = browserTabNew(mockPage);
      
      const mockNewPage = createMockPage();
      mockNewPage.title.mockResolvedValue('Google');
      mockNewPage.url.mockReturnValue('https://google.com');
      mockPages.push(mockNewPage);

      const result = await tool.func('https://google.com');

      expect(mockTabManager.createNewTab).toHaveBeenCalledWith(1, 'https://google.com');
      expect(result).toContain('Opened new tab (#1) in window 1');
    });

    it('should handle tab creation errors', async () => {
      const tool = browserTabNew(mockPage);
      mockTabManager.createNewTab.mockRejectedValue(new Error('Failed to create tab'));

      const result = await tool.func('https://example.com');

      expect(result).toBe('Error opening new tab: Failed to create tab');
    });

    it('should handle missing current tab ID', async () => {
      const tool = browserTabNew(mockPage);
      const { getCurrentTabId } = require('../../../../src/agent/tools/utils');
      getCurrentTabId.mockResolvedValue(null);

      const result = await tool.func('https://example.com');

      expect(result).toBe('Error opening new tab: Could not determine current tab ID');
    });

    it('should handle missing window ID', async () => {
      const tool = browserTabNew(mockPage);
      mockTabManager.getWindowForTab.mockReturnValue(null);

      const result = await tool.func('https://example.com');

      expect(result).toBe('Error opening new tab: Could not determine window ID for current tab');
    });

    it('should send targetCreated message', async () => {
      const tool = browserTabNew(mockPage);
      
      const mockNewPage = createMockPage();
      mockNewPage.title.mockResolvedValue('Test Page');
      mockNewPage.url.mockReturnValue('https://test.com');
      mockPages.push(mockNewPage);

      await tool.func('https://test.com');

      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'targetCreated',
        tabId: 456,
        targetInfo: {
          title: 'Test Page',
          url: 'https://test.com'
        }
      });
    });
  });

  describe('browserTabSelect', () => {
    it('should switch to a tab by index', async () => {
      const tool = browserTabSelect(mockPage);
      
      const mockPage2 = createMockPage();
      mockPage2.url.mockReturnValue('https://google.com');
      mockPage2.title.mockResolvedValue('Google');
      mockPages.push(mockPage2);

      const result = await tool.func('1');

      expect(mockPages[1].bringToFront).toHaveBeenCalled();
      expect(mockSetCurrentPage).toHaveBeenCalledWith(mockPages[1]);
      expect(result).toContain('Switched to tab 1. Now active: "Google" (https://google.com)');
    });

    it('should handle invalid index format', async () => {
      const tool = browserTabSelect(mockPage);

      const result = await tool.func('invalid');

      expect(result).toBe('Error: input must be a tab index (integer).');
      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it('should handle index out of range', async () => {
      const tool = browserTabSelect(mockPage);

      const result = await tool.func('5');

      expect(result).toBe('Error: index 5 out of range (0‑0).');
      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it('should handle negative index', async () => {
      const tool = browserTabSelect(mockPage);

      const result = await tool.func('-1');

      expect(result).toBe('Error: index -1 out of range (0‑0).');
      expect(mockSetCurrentPage).not.toHaveBeenCalled();
    });

    it('should send tab change messages', async () => {
      const tool = browserTabSelect(mockPage);
      const { getCurrentTabId } = require('../../../../src/agent/tools/utils');
      
      const mockPage2 = createMockPage();
      mockPage2.url.mockReturnValue('https://google.com');
      mockPage2.title.mockResolvedValue('Google');
      mockPages.push(mockPage2);

      // Mock getCurrentTabId to return different IDs for different pages
      getCurrentTabId
        .mockResolvedValueOnce(789) // Selected tab ID
        .mockResolvedValueOnce(123); // Original tab ID

      await tool.func('1');

      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'activeTabChanged',
        oldTabId: 123,
        newTabId: 789,
        title: 'Google',
        url: 'https://google.com'
      });

      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'tabTitleChanged',
        tabId: 789,
        title: 'Google'
      });
    });

    it('should handle tab switching errors', async () => {
      const tool = browserTabSelect(mockPage);
      
      const mockPage2 = createMockPage();
      mockPage2.bringToFront.mockRejectedValue(new Error('Failed to bring to front'));
      mockPages.push(mockPage2);

      const result = await tool.func('1');

      expect(result).toBe('Error selecting tab: Failed to bring to front');
    });

    it('should handle title retrieval errors gracefully', async () => {
      const tool = browserTabSelect(mockPage);
      
      const mockPage2 = createMockPage();
      mockPage2.url.mockReturnValue('https://google.com');
      mockPage2.title.mockRejectedValue(new Error('Title error'));
      mockPages.push(mockPage2);

      const result = await tool.func('1');

      expect(result).toContain('Switched to tab 1. Now active: "Unknown" (https://google.com)');
    });
  });

  describe('browserTabClose', () => {
    it('should close current tab when no index provided', async () => {
      const tool = browserTabClose(mockPage);
      // Mock indexOf method properly
      Object.defineProperty(mockPages, 'indexOf', {
        value: jest.fn().mockReturnValue(0),
        writable: true
      });

      const result = await tool.func('');

      expect(mockPage.close).toHaveBeenCalled();
      expect(result).toBe('Closed tab 0.');
    });

    it('should close tab by index', async () => {
      const tool = browserTabClose(mockPage);
      
      const mockPage2 = createMockPage();
      mockPages.push(mockPage2);

      const result = await tool.func('1');

      expect(mockPages[1].close).toHaveBeenCalled();
      expect(result).toBe('Closed tab 1.');
    });

    it('should handle invalid index', async () => {
      const tool = browserTabClose(mockPage);

      const result = await tool.func('invalid');

      expect(result).toBe('Error: invalid tab index.');
      expect(mockPage.close).not.toHaveBeenCalled();
    });

    it('should handle index out of range', async () => {
      const tool = browserTabClose(mockPage);

      const result = await tool.func('5');

      expect(result).toBe('Error: invalid tab index.');
      expect(mockPage.close).not.toHaveBeenCalled();
    });

    it('should update active page when closing current tab', async () => {
      const tool = browserTabClose(mockPage);
      
      const mockPage2 = createMockPage();
      mockPage2.title.mockResolvedValue('New Active Tab');
      mockPages.push(mockPage2);
      
      // Mock indexOf to return 0 for current page
      Object.defineProperty(mockPages, 'indexOf', {
        value: jest.fn().mockReturnValue(0),
        writable: true
      });
      
      const { getCurrentTabId } = require('../../../../src/agent/tools/utils');
      getCurrentTabId.mockResolvedValue(789);

      const result = await tool.func('0');

      expect(mockSetCurrentPage).toHaveBeenCalledWith(mockPages[0]); // Should switch to index 0 (which becomes the new page at index 0)
      expect(result).toBe('Closed tab 0.');
    });

    it('should send targetDestroyed message', async () => {
      const tool = browserTabClose(mockPage);
      const { getCurrentTabId } = require('../../../../src/agent/tools/utils');
      getCurrentTabId.mockResolvedValue(123);

      await tool.func('0');

      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'targetDestroyed',
        tabId: 123,
        url: 'about:blank'
      });
    });

    it('should handle tab closing errors', async () => {
      const tool = browserTabClose(mockPage);
      mockPage.close.mockRejectedValue(new Error('Failed to close tab'));

      const result = await tool.func('0');

      expect(result).toBe('Error closing tab: Failed to close tab');
    });

    it('should handle multiple tabs scenario', async () => {
      const tool = browserTabClose(mockPage);
      
      const mockPage2 = createMockPage();
      const mockPage3 = createMockPage();
      mockPages.push(mockPage2, mockPage3);

      const result = await tool.func('1');

      expect(mockPages[1].close).toHaveBeenCalled();
      expect(result).toBe('Closed tab 1.');
    });
  });

  describe('Tool Integration', () => {
    it('should handle complete tab workflow', async () => {
      const listTool = browserTabList(mockPage);
      const newTool = browserTabNew(mockPage);
      const selectTool = browserTabSelect(mockPage);
      const closeTool = browserTabClose(mockPage);

      // List initial tabs
      let result = await listTool.func('');
      expect(result).toBe('0: https://example.com');

      // Create new tab
      const mockNewPage = createMockPage();
      mockNewPage.title.mockResolvedValue('Google');
      mockNewPage.url.mockReturnValue('https://google.com');
      mockPages.push(mockNewPage);

      result = await newTool.func('https://google.com');
      expect(result).toContain('Opened new tab (#1)');

      // List tabs again
      result = await listTool.func('');
      expect(result).toBe('0: https://example.com\n1: https://google.com');

      // Select new tab
      result = await selectTool.func('1');
      expect(result).toContain('Switched to tab 1');

      // Close the tab
      result = await closeTool.func('1');
      expect(result).toBe('Closed tab 1.');
    });

    it('should handle error scenarios in workflow', async () => {
      const newTool = browserTabNew(mockPage);
      const selectTool = browserTabSelect(mockPage);

      // Try to create tab with error
      mockTabManager.createNewTab.mockRejectedValue(new Error('Creation failed'));
      let result = await newTool.func('https://example.com');
      expect(result).toContain('Error opening new tab');

      // Try to select invalid tab
      result = await selectTool.func('999');
      expect(result).toContain('Error: index 999 out of range');
    });

    it('should handle tab switching with messaging', async () => {
      const selectTool = browserTabSelect(mockPage);
      const { getCurrentTabId } = require('../../../../src/agent/tools/utils');
      
      const mockPage2 = createMockPage();
      mockPage2.url.mockReturnValue('https://test.com');
      mockPage2.title.mockResolvedValue('Test Page');
      mockPages.push(mockPage2);

      getCurrentTabId
        .mockResolvedValueOnce(456) // Selected tab ID
        .mockResolvedValueOnce(123); // Original tab ID

      await selectTool.func('1');

      // Should send both messages
      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'activeTabChanged' })
      );
      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tabTitleChanged' })
      );
    });

    it('should handle window management correctly', async () => {
      const newTool = browserTabNew(mockPage);
      
      // Test with different window ID
      mockTabManager.getWindowForTab.mockReturnValue(2);
      
      const mockNewPage = createMockPage();
      mockPages.push(mockNewPage);

      const result = await newTool.func('https://example.com');

      expect(mockTabManager.createNewTab).toHaveBeenCalledWith(2, 'https://example.com');
      expect(result).toContain('window 2');
    });
  });
});
