import { jest } from '@jest/globals';
import { createMockPage, mockChromeAPIs, mockPageContextManager } from '../../../mocks/playwright';
import { 
  mockMouseInteractions,
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
  browserMoveMouse,
  browserClickXY,
  browserDrag
} from '../../../../src/agent/tools/mouseTools';

describe('Mouse Tools', () => {
  let mockPage: any;
  let utilsMock: any;

  beforeEach(() => {
    mockPage = createMockPage();
    utilsMock = require('../../../../src/agent/tools/utils');
    jest.clearAllMocks();
  });

  describe('browserMoveMouse', () => {
    it('should move mouse to specified coordinates', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);

      const result = await tool.func('100|200');

      expect(result).toBe('Mouse moved to (100, 200)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(100, 200);
    });

    it('should handle coordinates with whitespace', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);

      const result = await tool.func('  300  |  400  ');

      expect(result).toBe('Mouse moved to (300, 400)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(300, 400);
    });

    it('should handle zero coordinates', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);

      const result = await tool.func('0|0');

      expect(result).toBe('Mouse moved to (0, 0)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(0, 0);
    });

    it('should handle large coordinates', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);

      const result = await tool.func('1920|1080');

      expect(result).toBe('Mouse moved to (1920, 1080)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(1920, 1080);
    });

    it('should handle negative coordinates', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);

      const result = await tool.func('-10|-20');

      expect(result).toBe('Mouse moved to (-10, -20)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(-10, -20);
    });

    it('should return error for invalid input format', async () => {
      const tool = browserMoveMouse(mockPage);

      const result = await tool.func('invalid');

      expect(result).toBe('Error: expected `x|y` numbers (e.g. 120|240)');
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('should return error for non-numeric x coordinate', async () => {
      const tool = browserMoveMouse(mockPage);

      const result = await tool.func('abc|200');

      expect(result).toBe('Error: expected `x|y` numbers (e.g. 120|240)');
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('should return error for non-numeric y coordinate', async () => {
      const tool = browserMoveMouse(mockPage);

      const result = await tool.func('100|xyz');

      expect(result).toBe('Error: expected `x|y` numbers (e.g. 120|240)');
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('should handle empty y coordinate as 0', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);

      const result = await tool.func('100|');

      expect(result).toBe('Mouse moved to (100, 0)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(100, 0);
    });

    it('should return error for missing separator', async () => {
      const tool = browserMoveMouse(mockPage);

      const result = await tool.func('100 200');

      expect(result).toBe('Error: expected `x|y` numbers (e.g. 120|240)');
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('should handle mouse move errors gracefully', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockRejectedValue(new Error('Mouse operation failed'));

      const result = await tool.func('100|200');

      expect(result).toContain('Error moving mouse: Mouse operation failed');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserMoveMouse(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);

      await tool.func('100|200');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserClickXY', () => {
    it('should click at specified coordinates', async () => {
      const tool = browserClickXY(mockPage);
      mockPage.mouse.click.mockResolvedValue(undefined);

      const result = await tool.func('250|380');

      expect(result).toBe('Clicked at (250, 380)');
      expect(mockPage.mouse.click).toHaveBeenCalledWith(250, 380);
    });

    it('should handle coordinates with whitespace', async () => {
      const tool = browserClickXY(mockPage);
      mockPage.mouse.click.mockResolvedValue(undefined);

      const result = await tool.func('  150  |  250  ');

      expect(result).toBe('Clicked at (150, 250)');
      expect(mockPage.mouse.click).toHaveBeenCalledWith(150, 250);
    });

    it('should handle zero coordinates', async () => {
      const tool = browserClickXY(mockPage);
      mockPage.mouse.click.mockResolvedValue(undefined);

      const result = await tool.func('0|0');

      expect(result).toBe('Clicked at (0, 0)');
      expect(mockPage.mouse.click).toHaveBeenCalledWith(0, 0);
    });

    it('should handle decimal coordinates', async () => {
      const tool = browserClickXY(mockPage);
      mockPage.mouse.click.mockResolvedValue(undefined);

      const result = await tool.func('100.5|200.7');

      expect(result).toBe('Clicked at (100.5, 200.7)');
      expect(mockPage.mouse.click).toHaveBeenCalledWith(100.5, 200.7);
    });

    it('should return error for invalid input format', async () => {
      const tool = browserClickXY(mockPage);

      const result = await tool.func('invalid');

      expect(result).toBe('Error: expected `x|y` numbers (e.g. 120|240)');
      expect(mockPage.mouse.click).not.toHaveBeenCalled();
    });

    it('should return error for non-numeric coordinates', async () => {
      const tool = browserClickXY(mockPage);

      const result = await tool.func('abc|def');

      expect(result).toBe('Error: expected `x|y` numbers (e.g. 120|240)');
      expect(mockPage.mouse.click).not.toHaveBeenCalled();
    });

    it('should return error for empty input', async () => {
      const tool = browserClickXY(mockPage);

      const result = await tool.func('');

      expect(result).toBe('Error: expected `x|y` numbers (e.g. 120|240)');
      expect(mockPage.mouse.click).not.toHaveBeenCalled();
    });

    it('should handle click errors gracefully', async () => {
      const tool = browserClickXY(mockPage);
      mockPage.mouse.click.mockRejectedValue(new Error('Click operation failed'));

      const result = await tool.func('100|200');

      expect(result).toContain('Error clicking at coords: Click operation failed');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserClickXY(mockPage);
      mockPage.mouse.click.mockResolvedValue(undefined);

      await tool.func('100|200');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('browserDrag', () => {
    it('should perform drag and drop operation', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      const result = await tool.func('100|200|300|400');

      expect(result).toBe('Dragged (100,200) → (300,400)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(100, 200);
      expect(mockPage.mouse.down).toHaveBeenCalled();
      expect(mockPage.mouse.move).toHaveBeenCalledWith(300, 400);
      expect(mockPage.mouse.up).toHaveBeenCalled();
    });

    it('should handle coordinates with whitespace', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      const result = await tool.func('  50  |  100  |  150  |  200  ');

      expect(result).toBe('Dragged (50,100) → (150,200)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(50, 100);
      expect(mockPage.mouse.move).toHaveBeenCalledWith(150, 200);
    });

    it('should handle zero coordinates', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      const result = await tool.func('0|0|100|100');

      expect(result).toBe('Dragged (0,0) → (100,100)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(0, 0);
      expect(mockPage.mouse.move).toHaveBeenCalledWith(100, 100);
    });

    it('should handle negative coordinates', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      const result = await tool.func('-10|-20|30|40');

      expect(result).toBe('Dragged (-10,-20) → (30,40)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(-10, -20);
      expect(mockPage.mouse.move).toHaveBeenCalledWith(30, 40);
    });

    it('should handle decimal coordinates', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      const result = await tool.func('10.5|20.7|30.2|40.9');

      expect(result).toBe('Dragged (10.5,20.7) → (30.2,40.9)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(10.5, 20.7);
      expect(mockPage.mouse.move).toHaveBeenCalledWith(30.2, 40.9);
    });

    it('should return error for invalid input format', async () => {
      const tool = browserDrag(mockPage);

      const result = await tool.func('invalid');

      expect(result).toBe('Error: expected `startX|startY|endX|endY` numbers');
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('should handle insufficient coordinates with undefined values', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      const result = await tool.func('100|200|300');

      expect(result).toBe('Dragged (100,200) → (300,undefined)');
      expect(mockPage.mouse.move).toHaveBeenCalledWith(100, 200);
      expect(mockPage.mouse.move).toHaveBeenCalledWith(300, undefined);
    });

    it('should return error for non-numeric coordinates', async () => {
      const tool = browserDrag(mockPage);

      const result = await tool.func('abc|def|ghi|jkl');

      expect(result).toBe('Error: expected `startX|startY|endX|endY` numbers');
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('should return error for mixed valid/invalid coordinates', async () => {
      const tool = browserDrag(mockPage);

      const result = await tool.func('100|200|abc|400');

      expect(result).toBe('Error: expected `startX|startY|endX|endY` numbers');
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('should handle drag operation errors gracefully', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockRejectedValue(new Error('Drag operation failed'));

      const result = await tool.func('100|200|300|400');

      expect(result).toContain('Error during drag: Drag operation failed');
    });

    it('should handle mouse down errors gracefully', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockRejectedValue(new Error('Mouse down failed'));

      const result = await tool.func('100|200|300|400');

      expect(result).toContain('Error during drag: Mouse down failed');
    });

    it('should handle mouse up errors gracefully', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockRejectedValue(new Error('Mouse up failed'));

      const result = await tool.func('100|200|300|400');

      expect(result).toContain('Error during drag: Mouse up failed');
    });

    it('should work with withActivePage utility', async () => {
      const tool = browserDrag(mockPage);
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      await tool.func('100|200|300|400');

      expect(utilsMock.withActivePage).toHaveBeenCalledWith(mockPage, expect.any(Function));
    });
  });

  describe('Tool Integration', () => {
    it('should handle multiple mouse operations in sequence', async () => {
      const moveTool = browserMoveMouse(mockPage);
      const clickTool = browserClickXY(mockPage);
      const dragTool = browserDrag(mockPage);
      
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.click.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      // Move mouse, then click, then drag
      const moveResult = await moveTool.func('100|100');
      const clickResult = await clickTool.func('200|200');
      const dragResult = await dragTool.func('300|300|400|400');

      expect(moveResult).toBe('Mouse moved to (100, 100)');
      expect(clickResult).toBe('Clicked at (200, 200)');
      expect(dragResult).toBe('Dragged (300,300) → (400,400)');
    });

    it('should work with all withActivePage calls', async () => {
      const moveTool = browserMoveMouse(mockPage);
      const clickTool = browserClickXY(mockPage);
      const dragTool = browserDrag(mockPage);
      
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.click.mockResolvedValue(undefined);
      mockPage.mouse.down.mockResolvedValue(undefined);
      mockPage.mouse.up.mockResolvedValue(undefined);

      await moveTool.func('100|100');
      await clickTool.func('200|200');
      await dragTool.func('300|300|400|400');

      expect(utilsMock.withActivePage).toHaveBeenCalledTimes(3);
    });

    it('should handle errors consistently across mouse tools', async () => {
      const moveTool = browserMoveMouse(mockPage);
      const clickTool = browserClickXY(mockPage);
      const dragTool = browserDrag(mockPage);
      
      mockPage.mouse.move.mockRejectedValue(mockErrorScenarios.elementNotFound);
      mockPage.mouse.click.mockRejectedValue(mockErrorScenarios.elementNotFound);

      const moveResult = await moveTool.func('100|100');
      const clickResult = await clickTool.func('200|200');
      const dragResult = await dragTool.func('300|300|400|400');

      expect(moveResult).toContain('Error moving mouse');
      expect(clickResult).toContain('Error clicking at coords');
      expect(dragResult).toContain('Error during drag');
    });

    it('should handle boundary coordinates correctly', async () => {
      const moveTool = browserMoveMouse(mockPage);
      const clickTool = browserClickXY(mockPage);
      
      mockPage.mouse.move.mockResolvedValue(undefined);
      mockPage.mouse.click.mockResolvedValue(undefined);

      // Test very large coordinates
      const moveResult = await moveTool.func('9999|9999');
      const clickResult = await clickTool.func('0|0');

      expect(moveResult).toBe('Mouse moved to (9999, 9999)');
      expect(clickResult).toBe('Clicked at (0, 0)');
    });
  });
});
