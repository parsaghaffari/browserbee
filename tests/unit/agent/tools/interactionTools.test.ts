import { jest } from '@jest/globals';
import { createMockPage, mockChromeAPIs, mockPageContextManager } from '../../../mocks/playwright';
import { 
  mockClickInteractions,
  mockFormInteractions,
  mockDialogScenarios,
  mockErrorScenarios
} from '../../../fixtures/toolTestData';

// Mock dependencies before importing the tools
jest.mock('../../../../src/agent/PageContextManager', () => mockPageContextManager);

// Mock Chrome APIs
global.chrome = mockChromeAPIs as any;

// Mock the utils module
jest.mock('../../../../src/agent/tools/utils', () => ({
  withActivePage: jest.fn().mockImplementation((page, fn) => fn(page)),
  installDialogListener: jest.fn(),
  lastDialog: null,
  resetDialog: jest.fn(),
}));

// Import the tools after mocking dependencies
import {
  browserClick,
  browserType,
  browserHandleDialog
} from '../../../../src/agent/tools/interactionTools';

describe('Interaction Tools', () => {
  let mockPage: any;
  let utilsMock: any;

  beforeEach(() => {
    mockPage = createMockPage();
    utilsMock = require('../../../../src/agent/tools/utils');
    jest.clearAllMocks();
    
    // Reset dialog state
    utilsMock.lastDialog = null;
  });

  describe('browserClick', () => {
    it('should click element by CSS selector', async () => {
      const tool = browserClick(mockPage);
      mockPage.click.mockResolvedValue(undefined);

      const result = await tool.func('.cta-button');

      expect(result).toBe('Clicked selector: .cta-button');
      expect(mockPage.click).toHaveBeenCalledWith('.cta-button');
    });

    it('should click element by text content', async () => {
      const tool = browserClick(mockPage);
      const mockGetByText = {
        click: jest.fn().mockResolvedValue(undefined)
      };
      mockPage.getByText.mockReturnValue(mockGetByText);

      const result = await tool.func('Get Started');

      expect(result).toBe('Clicked element containing text: Get Started');
      expect(mockPage.getByText).toHaveBeenCalledWith('Get Started');
      expect(mockGetByText.click).toHaveBeenCalled();
    });

    it('should detect CSS selectors correctly', async () => {
      const tool = browserClick(mockPage);
      mockPage.click.mockResolvedValue(undefined);

      // Test various CSS selector patterns
      await tool.func('#myId');
      expect(mockPage.click).toHaveBeenCalledWith('#myId');

      await tool.func('.myClass');
      expect(mockPage.click).toHaveBeenCalledWith('.myClass');

      await tool.func('[data-test="button"]');
      expect(mockPage.click).toHaveBeenCalledWith('[data-test="button"]');

      await tool.func('button.primary');
      expect(mockPage.click).toHaveBeenCalledWith('button.primary');
    });

    it('should handle click errors gracefully', async () => {
      const tool = browserClick(mockPage);
      mockPage.click.mockRejectedValue(new Error('Element not found'));

      const result = await tool.func('.nonexistent-element');

      expect(result).toContain('Error clicking \'.nonexistent-element\'');
      expect(result).toContain('Element not found');
    });

    it('should handle text-based click errors', async () => {
      const tool = browserClick(mockPage);
      const mockGetByText = {
        click: jest.fn().mockRejectedValue(new Error('Text not found'))
      };
      mockPage.getByText.mockReturnValue(mockGetByText);

      const result = await tool.func('Nonexistent Text');

      expect(result).toContain('Error clicking \'Nonexistent Text\'');
      expect(result).toContain('Text not found');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserClick(mockPage);
      mockPage.click.mockResolvedValue(undefined);

      await tool.func('.test-button');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserType', () => {
    it('should type text into specified selector', async () => {
      const tool = browserType(mockPage);
      mockPage.fill.mockResolvedValue(undefined);

      const result = await tool.func('input[name="name"]|John Doe');

      expect(result).toBe('Typed "John Doe" into input[name="name"]');
      expect(mockPage.fill).toHaveBeenCalledWith('input[name="name"]', 'John Doe');
    });

    it('should handle complex text with special characters', async () => {
      const tool = browserType(mockPage);
      mockPage.fill.mockResolvedValue(undefined);

      const complexText = 'Hello! @#$%^&*()_+ World\nNew Line';
      const result = await tool.func(`textarea[name="message"]|${complexText}`);

      expect(result).toBe(`Typed "${complexText}" into textarea[name="message"]`);
      expect(mockPage.fill).toHaveBeenCalledWith('textarea[name="message"]', complexText);
    });

    it('should handle email input correctly', async () => {
      const tool = browserType(mockPage);
      mockPage.fill.mockResolvedValue(undefined);

      const result = await tool.func('input[type="email"]|john@example.com');

      expect(result).toBe('Typed "john@example.com" into input[type="email"]');
      expect(mockPage.fill).toHaveBeenCalledWith('input[type="email"]', 'john@example.com');
    });

    it('should return error for invalid input format', async () => {
      const tool = browserType(mockPage);

      const result = await tool.func('invalid-format');

      expect(result).toBe('Error: expected \'selector|text\'');
      expect(mockPage.fill).not.toHaveBeenCalled();
    });

    it('should return error for missing selector', async () => {
      const tool = browserType(mockPage);

      const result = await tool.func('|text only');

      expect(result).toBe('Error: expected \'selector|text\'');
      expect(mockPage.fill).not.toHaveBeenCalled();
    });

    it('should return error for missing text', async () => {
      const tool = browserType(mockPage);

      const result = await tool.func('input[name="test"]|');

      expect(result).toBe('Error: expected \'selector|text\'');
      expect(mockPage.fill).not.toHaveBeenCalled();
    });

    it('should handle typing errors gracefully', async () => {
      const tool = browserType(mockPage);
      mockPage.fill.mockRejectedValue(new Error('Element not found'));

      const result = await tool.func('input[name="nonexistent"]|test');

      expect(result).toContain('Error typing into \'input[name="nonexistent"]|test\'');
      expect(result).toContain('Element not found');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserType(mockPage);
      mockPage.fill.mockResolvedValue(undefined);

      await tool.func('input|test');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserHandleDialog', () => {
    let mockDialog: any;

    beforeEach(() => {
      mockDialog = {
        type: jest.fn(),
        accept: jest.fn().mockResolvedValue(undefined),
        dismiss: jest.fn().mockResolvedValue(undefined)
      };
    });

    it('should install dialog listener on creation', () => {
      browserHandleDialog(mockPage);

      expect(utilsMock.installDialogListener).toHaveBeenCalledWith(mockPage);
    });

    it('should accept alert dialog', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.type.mockReturnValue('alert');

      const result = await tool.func('accept');

      expect(result).toBe('Accepted alert dialog.');
      expect(mockDialog.accept).toHaveBeenCalledWith(undefined);
      expect(utilsMock.resetDialog).toHaveBeenCalled();
    });

    it('should dismiss confirm dialog', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.type.mockReturnValue('confirm');

      const result = await tool.func('dismiss');

      expect(result).toBe('Dismissed confirm dialog.');
      expect(mockDialog.dismiss).toHaveBeenCalled();
      expect(utilsMock.resetDialog).toHaveBeenCalled();
    });

    it('should accept prompt dialog with text', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.type.mockReturnValue('prompt');

      const result = await tool.func('accept|John Doe');

      expect(result).toBe('Accepted prompt dialog.');
      // The implementation converts text to lowercase, so we expect lowercase
      expect(mockDialog.accept).toHaveBeenCalledWith('john doe');
      expect(utilsMock.resetDialog).toHaveBeenCalled();
    });

    it('should accept prompt dialog without text', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.type.mockReturnValue('prompt');

      const result = await tool.func('accept');

      expect(result).toBe('Accepted prompt dialog.');
      expect(mockDialog.accept).toHaveBeenCalledWith(undefined);
      expect(utilsMock.resetDialog).toHaveBeenCalled();
    });

    it('should handle case-insensitive input', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.type.mockReturnValue('alert');

      const result = await tool.func('ACCEPT');

      expect(result).toBe('Accepted alert dialog.');
      expect(mockDialog.accept).toHaveBeenCalled();
    });

    it('should handle whitespace in input', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.type.mockReturnValue('confirm');

      const result = await tool.func('  dismiss  ');

      expect(result).toBe('Dismissed confirm dialog.');
      expect(mockDialog.dismiss).toHaveBeenCalled();
    });

    it('should return error when no dialog is open', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = null;

      const result = await tool.func('accept');

      expect(result).toBe('Error: no dialog is currently open or was detected.');
    });

    it('should return error for invalid action', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;

      const result = await tool.func('invalid');

      expect(result).toBe('Error: first part must be `accept` or `dismiss`.');
    });

    it('should handle dialog operation errors', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.accept.mockRejectedValue(new Error('Dialog operation failed'));

      const result = await tool.func('accept');

      expect(result).toContain('Error handling dialog: Dialog operation failed');
    });

    it('should handle prompt with complex text', async () => {
      const tool = browserHandleDialog(mockPage);
      utilsMock.lastDialog = mockDialog;
      mockDialog.type.mockReturnValue('prompt');

      const complexText = 'Hello World! @#$%^&*()';
      const result = await tool.func(`accept|${complexText}`);

      expect(result).toBe('Accepted prompt dialog.');
      // The implementation converts text to lowercase, so we expect lowercase
      expect(mockDialog.accept).toHaveBeenCalledWith('hello world! @#$%^&*()');
    });
  });

  describe('Tool Integration', () => {
    it('should handle multiple interactions in sequence', async () => {
      const clickTool = browserClick(mockPage);
      const typeTool = browserType(mockPage);
      
      mockPage.click.mockResolvedValue(undefined);
      mockPage.fill.mockResolvedValue(undefined);

      // Simulate clicking a field then typing into it
      const clickResult = await clickTool.func('input[name="username"]');
      const typeResult = await typeTool.func('input[name="username"]|testuser');

      expect(clickResult).toBe('Clicked selector: input[name="username"]');
      expect(typeResult).toBe('Typed "testuser" into input[name="username"]');
    });

    it('should work with all withActivePage calls', async () => {
      const clickTool = browserClick(mockPage);
      const typeTool = browserType(mockPage);
      
      mockPage.click.mockResolvedValue(undefined);
      mockPage.fill.mockResolvedValue(undefined);

      await clickTool.func('.button');
      await typeTool.func('input|text');

      expect(utilsMock.withActivePage).toHaveBeenCalledTimes(2);
    });

    it('should handle errors consistently across tools', async () => {
      const clickTool = browserClick(mockPage);
      const typeTool = browserType(mockPage);
      
      mockPage.click.mockRejectedValue(mockErrorScenarios.elementNotFound);
      mockPage.fill.mockRejectedValue(mockErrorScenarios.elementNotFound);

      const clickResult = await clickTool.func('.nonexistent');
      const typeResult = await typeTool.func('input|text');

      expect(clickResult).toContain('Error clicking');
      expect(typeResult).toContain('Error typing into');
    });
  });
});
