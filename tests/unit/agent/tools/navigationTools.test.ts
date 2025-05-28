import { jest } from '@jest/globals';
import { createMockPage, mockChromeAPIs, mockPageContextManager } from '../../../mocks/playwright';
import { 
  mockNavigationScenarios,
  mockErrorScenarios
} from '../../../fixtures/toolTestData';

// Mock dependencies before importing the tools
jest.mock('../../../../src/agent/PageContextManager', () => mockPageContextManager);

// Mock Chrome APIs
global.chrome = mockChromeAPIs as any;

// Mock the utils module
jest.mock('../../../../src/agent/tools/utils', () => ({
  withActivePage: jest.fn().mockImplementation((page, fn) => fn(page)),
  getCurrentTabId: jest.fn().mockResolvedValue(123),
}));

// Import the tools after mocking dependencies
import {
  browserNavigate,
  browserWaitForNavigation,
  browserNavigateBack,
  browserNavigateForward
} from '../../../../src/agent/tools/navigationTools';

describe('Navigation Tools', () => {
  let mockPage: any;
  let utilsMock: any;

  beforeEach(() => {
    mockPage = createMockPage();
    utilsMock = require('../../../../src/agent/tools/utils');
    jest.clearAllMocks();
  });

  describe('browserNavigate', () => {
    it('should navigate to a valid URL', async () => {
      const tool = browserNavigate(mockPage);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockResolvedValue('Example Domain');

      const result = await tool.func('https://example.com');

      expect(result).toBe('Successfully navigated to https://example.com');
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
    });

    it('should send Chrome messages after successful navigation', async () => {
      const tool = browserNavigate(mockPage);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockResolvedValue('Example Domain');

      await tool.func('https://example.com');

      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'tabTitleChanged',
        tabId: 123,
        title: 'Example Domain'
      });

      expect(mockChromeAPIs.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'targetChanged',
        tabId: 123,
        url: 'https://example.com'
      });
    });

    it('should handle navigation to different URL types', async () => {
      const tool = browserNavigate(mockPage);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockResolvedValue('Test Page');

      // Test HTTPS URL
      await tool.func('https://secure.example.com');
      expect(mockPage.goto).toHaveBeenCalledWith('https://secure.example.com');

      // Test HTTP URL
      await tool.func('http://example.com');
      expect(mockPage.goto).toHaveBeenCalledWith('http://example.com');

      // Test URL with path and query
      await tool.func('https://example.com/path?query=value');
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/path?query=value');
    });

    it('should handle navigation errors gracefully', async () => {
      const tool = browserNavigate(mockPage);
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      const result = await tool.func('https://invalid-url.com');

      expect(result).toContain('Error navigating to https://invalid-url.com');
      expect(result).toContain('Navigation failed');
    });

    it('should handle title update errors without failing navigation', async () => {
      const tool = browserNavigate(mockPage);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockRejectedValue(new Error('Title error'));
      utilsMock.getCurrentTabId.mockResolvedValue(123);

      const result = await tool.func('https://example.com');

      expect(result).toBe('Successfully navigated to https://example.com');
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
    });

    it('should handle missing tab ID gracefully', async () => {
      const tool = browserNavigate(mockPage);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockResolvedValue('Test Page');
      utilsMock.getCurrentTabId.mockResolvedValue(undefined);

      const result = await tool.func('https://example.com');

      expect(result).toBe('Successfully navigated to https://example.com');
      expect(mockChromeAPIs.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserNavigate(mockPage);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockResolvedValue('Test Page');

      await tool.func('https://example.com');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserWaitForNavigation', () => {
    it('should wait for load state by default', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await tool.func('');

      expect(result).toBe('Navigation complete.');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('load', { timeout: 5000 });
    });

    it('should wait for load state when specified', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await tool.func('load');

      expect(result).toBe('Navigation complete (DOM loaded).');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('load', { timeout: 10000 });
    });

    it('should wait for domcontentloaded when specified', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await tool.func('domcontentloaded');

      expect(result).toBe('Navigation complete (DOM content loaded).');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded', { timeout: 10000 });
    });

    it('should wait for networkidle when specified', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await tool.func('networkidle');

      expect(result).toBe('Navigation complete (network idle).');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 10000 });
    });

    it('should handle case-insensitive strategy input', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      await tool.func('LOAD');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('load', { timeout: 10000 });

      await tool.func('DomContentLoaded');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded', { timeout: 10000 });
    });

    it('should use "all" strategy for unknown input', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await tool.func('unknown');

      expect(result).toBe('Navigation complete.');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('load', { timeout: 5000 });
    });

    it('should fallback to domcontentloaded when load fails in "all" strategy', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState
        .mockRejectedValueOnce(new Error('Load timeout'))
        .mockResolvedValueOnce(undefined);

      const result = await tool.func('all');

      expect(result).toBe('Navigation partially complete (DOM content loaded).');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('load', { timeout: 5000 });
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded', { timeout: 5000 });
    });

    it('should try networkidle after load in "all" strategy', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      const result = await tool.func('all');

      expect(result).toBe('Navigation complete.');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('load', { timeout: 5000 });
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 5000 });
    });

    it('should ignore networkidle errors in "all" strategy', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState
        .mockResolvedValueOnce(undefined) // load succeeds
        .mockRejectedValueOnce(new Error('Network idle timeout')); // networkidle fails

      const result = await tool.func('all');

      expect(result).toBe('Navigation complete.');
    });

    it('should handle navigation wait errors', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockRejectedValue(new Error('Wait timeout'));

      const result = await tool.func('load');

      expect(result).toContain('Error waiting for navigation');
      expect(result).toContain('Wait timeout');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserWaitForNavigation(mockPage);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      await tool.func('load');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserNavigateBack', () => {
    it('should navigate back successfully', async () => {
      const tool = browserNavigateBack(mockPage);
      mockPage.goBack.mockResolvedValue(undefined);

      const result = await tool.func('');

      expect(result).toBe('Navigated back.');
      expect(mockPage.goBack).toHaveBeenCalled();
    });

    it('should handle back navigation errors', async () => {
      const tool = browserNavigateBack(mockPage);
      mockPage.goBack.mockRejectedValue(new Error('No previous page'));

      const result = await tool.func('');

      expect(result).toContain('Error going back');
      expect(result).toContain('No previous page');
    });

    it('should ignore input parameter', async () => {
      const tool = browserNavigateBack(mockPage);
      mockPage.goBack.mockResolvedValue(undefined);

      const result = await tool.func('ignored input');

      expect(result).toBe('Navigated back.');
      expect(mockPage.goBack).toHaveBeenCalled();
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserNavigateBack(mockPage);
      mockPage.goBack.mockResolvedValue(undefined);

      await tool.func('');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserNavigateForward', () => {
    it('should navigate forward successfully', async () => {
      const tool = browserNavigateForward(mockPage);
      mockPage.goForward.mockResolvedValue(undefined);

      const result = await tool.func('');

      expect(result).toBe('Navigated forward.');
      expect(mockPage.goForward).toHaveBeenCalled();
    });

    it('should handle forward navigation errors', async () => {
      const tool = browserNavigateForward(mockPage);
      mockPage.goForward.mockRejectedValue(new Error('No next page'));

      const result = await tool.func('');

      expect(result).toContain('Error going forward');
      expect(result).toContain('No next page');
    });

    it('should ignore input parameter', async () => {
      const tool = browserNavigateForward(mockPage);
      mockPage.goForward.mockResolvedValue(undefined);

      const result = await tool.func('ignored input');

      expect(result).toBe('Navigated forward.');
      expect(mockPage.goForward).toHaveBeenCalled();
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserNavigateForward(mockPage);
      mockPage.goForward.mockResolvedValue(undefined);

      await tool.func('');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('Tool Integration', () => {
    it('should handle navigation sequence', async () => {
      const navigateTool = browserNavigate(mockPage);
      const waitTool = browserWaitForNavigation(mockPage);
      const backTool = browserNavigateBack(mockPage);
      
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockResolvedValue('Test Page');
      mockPage.waitForLoadState.mockResolvedValue(undefined);
      mockPage.goBack.mockResolvedValue(undefined);

      // Navigate to a page
      const navigateResult = await navigateTool.func('https://example.com');
      expect(navigateResult).toBe('Successfully navigated to https://example.com');

      // Wait for navigation to complete
      const waitResult = await waitTool.func('load');
      expect(waitResult).toBe('Navigation complete (DOM loaded).');

      // Navigate back
      const backResult = await backTool.func('');
      expect(backResult).toBe('Navigated back.');
    });

    it('should work with all withActivePage calls', async () => {
      const navigateTool = browserNavigate(mockPage);
      const backTool = browserNavigateBack(mockPage);
      const forwardTool = browserNavigateForward(mockPage);
      
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.title.mockResolvedValue('Test Page');
      mockPage.goBack.mockResolvedValue(undefined);
      mockPage.goForward.mockResolvedValue(undefined);

      await navigateTool.func('https://example.com');
      await backTool.func('');
      await forwardTool.func('');

      expect(utilsMock.withActivePage).toHaveBeenCalledTimes(3);
    });

    it('should handle errors consistently across navigation tools', async () => {
      const navigateTool = browserNavigate(mockPage);
      const backTool = browserNavigateBack(mockPage);
      const forwardTool = browserNavigateForward(mockPage);
      
      mockPage.goto.mockRejectedValue(mockErrorScenarios.networkError);
      mockPage.goBack.mockRejectedValue(mockErrorScenarios.pageNotLoaded);
      mockPage.goForward.mockRejectedValue(mockErrorScenarios.pageNotLoaded);

      const navigateResult = await navigateTool.func('https://example.com');
      const backResult = await backTool.func('');
      const forwardResult = await forwardTool.func('');

      expect(navigateResult).toContain('Error navigating to');
      expect(backResult).toContain('Error going back');
      expect(forwardResult).toContain('Error going forward');
    });
  });
});
