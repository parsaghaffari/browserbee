import { jest } from '@jest/globals';
import { createMockPage, mockChromeAPIs, mockPageContextManager } from '../../../mocks/playwright';
import { 
  mockKeyboardInteractions,
  mockErrorScenarios
} from '../../../fixtures/toolTestData';

// Mock dependencies before importing the tools
jest.mock('../../../../src/agent/PageContextManager', () => mockPageContextManager);

// Mock Chrome APIs
global.chrome = mockChromeAPIs as any;

// Mock the utils module
jest.mock('../../../../src/agent/tools/utils', () => ({
  withActivePage: jest.fn().mockImplementation((page, fn) => fn(page)),
}));

// Import the tools after mocking dependencies
import {
  browserPressKey,
  browserKeyboardType
} from '../../../../src/agent/tools/keyboardTools';

describe('Keyboard Tools', () => {
  let mockPage: any;
  let utilsMock: any;

  beforeEach(() => {
    mockPage = createMockPage();
    utilsMock = require('../../../../src/agent/tools/utils');
    jest.clearAllMocks();
  });

  describe('browserPressKey', () => {
    it('should press a single key', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('Enter');

      expect(result).toBe('Pressed key: Enter');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    });

    it('should handle arrow keys', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('ArrowLeft');

      expect(result).toBe('Pressed key: ArrowLeft');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('ArrowLeft');
    });

    it('should handle function keys', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('F1');

      expect(result).toBe('Pressed key: F1');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('F1');
    });

    it('should handle modifier keys', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('Control');

      expect(result).toBe('Pressed key: Control');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Control');
    });

    it('should handle key combinations', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('Control+A');

      expect(result).toBe('Pressed key: Control+A');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Control+A');
    });

    it('should handle complex key combinations', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('Control+Shift+Z');

      expect(result).toBe('Pressed key: Control+Shift+Z');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Control+Shift+Z');
    });

    it('should handle single character keys', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('a');

      expect(result).toBe('Pressed key: a');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('a');
    });

    it('should handle special keys', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const specialKeys = ['Escape', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown'];
      
      for (const key of specialKeys) {
        const result = await tool.func(key);
        expect(result).toBe(`Pressed key: ${key}`);
        expect(mockPage.keyboard.press).toHaveBeenCalledWith(key);
      }
    });

    it('should handle keys with whitespace', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      const result = await tool.func('  Enter  ');

      expect(result).toBe('Pressed key: Enter');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    });

    it('should return error for empty key name', async () => {
      const tool = browserPressKey(mockPage);

      const result = await tool.func('');

      expect(result).toBe('Error: key name required');
      expect(mockPage.keyboard.press).not.toHaveBeenCalled();
    });

    it('should return error for whitespace-only key name', async () => {
      const tool = browserPressKey(mockPage);

      const result = await tool.func('   ');

      expect(result).toBe('Error: key name required');
      expect(mockPage.keyboard.press).not.toHaveBeenCalled();
    });

    it('should handle key press errors gracefully', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockRejectedValue(new Error('Key press failed'));

      const result = await tool.func('Enter');

      expect(result).toContain('Error pressing key \'Enter\': Key press failed');
    });

    it('should handle invalid key names gracefully', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockRejectedValue(new Error('Invalid key name'));

      const result = await tool.func('InvalidKey');

      expect(result).toContain('Error pressing key \'InvalidKey\': Invalid key name');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserPressKey(mockPage);
      mockPage.keyboard.press.mockResolvedValue(undefined);

      await tool.func('Enter');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserKeyboardType', () => {
    it('should type simple text', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const result = await tool.func('Hello World');

      expect(result).toBe('Typed 11 characters');
      expect(mockPage.keyboard.type).toHaveBeenCalledWith('Hello World');
    });

    it('should type text with special characters', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = 'Hello! @#$%^&*()_+ World';
      const result = await tool.func(text);

      expect(result).toBe(`Typed ${text.length} characters`);
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should type text with numbers', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = 'Test123456789';
      const result = await tool.func(text);

      expect(result).toBe(`Typed ${text.length} characters`);
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should type text with newlines', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = 'Line 1\\nLine 2\\nLine 3';
      const result = await tool.func(text);

      expect(result).toBe(`Typed ${text.length} characters`);
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should type multiline text', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = 'First line\nSecond line\nThird line';
      const result = await tool.func(text);

      expect(result).toBe(`Typed ${text.length} characters`);
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should type empty string', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const result = await tool.func('');

      expect(result).toBe('Typed 0 characters');
      expect(mockPage.keyboard.type).toHaveBeenCalledWith('');
    });

    it('should type whitespace-only text', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = '   ';
      const result = await tool.func(text);

      expect(result).toBe(`Typed ${text.length} characters`);
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should type long text', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = 'A'.repeat(1000);
      const result = await tool.func(text);

      expect(result).toBe('Typed 1000 characters');
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should type text with unicode characters', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = 'Hello 世界 🌍 café naïve résumé';
      const result = await tool.func(text);

      expect(result).toBe(`Typed ${text.length} characters`);
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should type text with tabs and spaces', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      const text = 'Text\twith\ttabs\tand   spaces';
      const result = await tool.func(text);

      expect(result).toBe(`Typed ${text.length} characters`);
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
    });

    it('should handle typing errors gracefully', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockRejectedValue(new Error('Typing failed'));

      const result = await tool.func('Hello World');

      expect(result).toContain('Error typing text: Typing failed');
    });

    it('should handle focus errors gracefully', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockRejectedValue(new Error('No element focused'));

      const result = await tool.func('Hello World');

      expect(result).toContain('Error typing text: No element focused');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserKeyboardType(mockPage);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      await tool.func('Hello World');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('Tool Integration', () => {
    it('should handle keyboard operations in sequence', async () => {
      const pressTool = browserPressKey(mockPage);
      const typeTool = browserKeyboardType(mockPage);
      
      mockPage.keyboard.press.mockResolvedValue(undefined);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      // Press Ctrl+A to select all, then type new text
      const pressResult = await pressTool.func('Control+A');
      const typeResult = await typeTool.func('New text content');

      expect(pressResult).toBe('Pressed key: Control+A');
      expect(typeResult).toBe('Typed 16 characters');
    });

    it('should handle complex text editing workflow', async () => {
      const pressTool = browserPressKey(mockPage);
      const typeTool = browserKeyboardType(mockPage);
      
      mockPage.keyboard.press.mockResolvedValue(undefined);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      // Simulate editing workflow: Home, Shift+End, Delete, Type
      await pressTool.func('Home');
      await pressTool.func('Shift+End');
      await pressTool.func('Delete');
      const typeResult = await typeTool.func('Replacement text');

      expect(typeResult).toBe('Typed 16 characters');
      expect(mockPage.keyboard.press).toHaveBeenCalledTimes(3);
      expect(mockPage.keyboard.type).toHaveBeenCalledTimes(1);
    });

    it('should work with all withActivePage calls', async () => {
      const pressTool = browserPressKey(mockPage);
      const typeTool = browserKeyboardType(mockPage);
      
      mockPage.keyboard.press.mockResolvedValue(undefined);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      await pressTool.func('Enter');
      await typeTool.func('Hello');
      await pressTool.func('Tab');

      expect(utilsMock.withActivePage).toHaveBeenCalledTimes(3);
    });

    it('should handle errors consistently across keyboard tools', async () => {
      const pressTool = browserPressKey(mockPage);
      const typeTool = browserKeyboardType(mockPage);
      
      mockPage.keyboard.press.mockRejectedValue(mockErrorScenarios.elementNotFound);
      mockPage.keyboard.type.mockRejectedValue(mockErrorScenarios.elementNotFound);

      const pressResult = await pressTool.func('Enter');
      const typeResult = await typeTool.func('Hello');

      expect(pressResult).toContain('Error pressing key');
      expect(typeResult).toContain('Error typing text');
    });

    it('should handle navigation and typing together', async () => {
      const pressTool = browserPressKey(mockPage);
      const typeTool = browserKeyboardType(mockPage);
      
      mockPage.keyboard.press.mockResolvedValue(undefined);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      // Navigate to end of field and add text
      await pressTool.func('End');
      await typeTool.func(' - Additional text');
      await pressTool.func('Enter');

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('End');
      expect(mockPage.keyboard.type).toHaveBeenCalledWith(' - Additional text');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    });

    it('should handle form navigation workflow', async () => {
      const pressTool = browserPressKey(mockPage);
      const typeTool = browserKeyboardType(mockPage);
      
      mockPage.keyboard.press.mockResolvedValue(undefined);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      // Fill form fields using Tab navigation
      await typeTool.func('John Doe');
      await pressTool.func('Tab');
      await typeTool.func('john@example.com');
      await pressTool.func('Tab');
      await typeTool.func('Hello, this is a message');
      await pressTool.func('Tab');
      await pressTool.func('Enter'); // Submit

      expect(mockPage.keyboard.type).toHaveBeenCalledTimes(3);
      expect(mockPage.keyboard.press).toHaveBeenCalledTimes(4);
    });

    it('should handle text selection and replacement', async () => {
      const pressTool = browserPressKey(mockPage);
      const typeTool = browserKeyboardType(mockPage);
      
      mockPage.keyboard.press.mockResolvedValue(undefined);
      mockPage.keyboard.type.mockResolvedValue(undefined);

      // Select word and replace
      await pressTool.func('Control+Shift+ArrowRight');
      await typeTool.func('replacement');

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Control+Shift+ArrowRight');
      expect(mockPage.keyboard.type).toHaveBeenCalledWith('replacement');
    });
  });
});
