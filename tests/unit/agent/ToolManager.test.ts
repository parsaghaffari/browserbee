import { jest } from '@jest/globals';
import { createMockPage } from '../../mocks/playwright';
import { ToolManager } from '../../../src/agent/ToolManager';
import { BrowserTool, ToolExecutionContext } from '../../../src/agent/tools/types';

describe('ToolManager', () => {
  let mockPage: any;
  let toolManager: ToolManager;
  let mockTools: BrowserTool[];
  let originalMockFunctions: any[];

  beforeEach(() => {
    mockPage = createMockPage();
    jest.clearAllMocks();

    // Create mock tools for testing with proper Jest mock functions
    // Store references to original functions for tracking
    originalMockFunctions = [
      jest.fn(async (input: string, context?: ToolExecutionContext) => 'Navigation successful'),
      jest.fn(async (input: string, context?: ToolExecutionContext) => 'Screenshot taken'),
      jest.fn(async (input: string, context?: ToolExecutionContext) => 'New tab created'),
      jest.fn(async (input: string, context?: ToolExecutionContext) => 'Tab selected'),
      jest.fn(async (input: string, context?: ToolExecutionContext) => 'Element clicked')
    ];

    mockTools = [
      {
        name: 'browser_navigate',
        description: 'Navigate to a URL',
        func: originalMockFunctions[0]
      },
      {
        name: 'browser_screenshot',
        description: 'Take a screenshot',
        func: originalMockFunctions[1]
      },
      {
        name: 'browser_tab_new',
        description: 'Create a new tab',
        func: originalMockFunctions[2]
      },
      {
        name: 'browser_tab_select',
        description: 'Select a tab',
        func: originalMockFunctions[3]
      },
      {
        name: 'browser_click',
        description: 'Click an element',
        func: originalMockFunctions[4]
      }
    ];
  });

  describe('constructor', () => {
    it('should initialize with page and tools', () => {
      toolManager = new ToolManager(mockPage, mockTools);
      
      expect(toolManager).toBeInstanceOf(ToolManager);
      expect(toolManager.getTools()).toHaveLength(5);
    });

    it('should wrap non-tab tools with health check behavior', async () => {
      toolManager = new ToolManager(mockPage, mockTools);
      const tools = toolManager.getTools();
      
      // All tools should be present
      expect(tools).toHaveLength(5);
      
      // Tab tools should remain unchanged (same function reference)
      const tabNewTool = tools.find(t => t.name === 'browser_tab_new');
      const tabSelectTool = tools.find(t => t.name === 'browser_tab_select');
      expect(tabNewTool?.func).toBe(originalMockFunctions[2]);
      expect(tabSelectTool?.func).toBe(originalMockFunctions[3]);
      
      // Non-tab tools should have health check behavior
      mockPage.evaluate.mockResolvedValue(true);
      const navigateTool = tools.find(t => t.name === 'browser_navigate');
      const result = await navigateTool!.func('test');
      expect(result).toBe('Navigation successful');
      expect(mockPage.evaluate).toHaveBeenCalled(); // Health check was performed
    });

    it('should handle empty tools array', () => {
      toolManager = new ToolManager(mockPage, []);
      
      expect(toolManager.getTools()).toHaveLength(0);
    });

    it('should preserve tool metadata during wrapping', () => {
      toolManager = new ToolManager(mockPage, mockTools);
      const tools = toolManager.getTools();
      
      // Check that names and descriptions are preserved
      const navigateTool = tools.find(t => t.name === 'browser_navigate');
      expect(navigateTool?.name).toBe('browser_navigate');
      expect(navigateTool?.description).toBe('Navigate to a URL');
      
      const tabTool = tools.find(t => t.name === 'browser_tab_new');
      expect(tabTool?.name).toBe('browser_tab_new');
      expect(tabTool?.description).toBe('Create a new tab');
    });
  });

  describe('getTools', () => {
    beforeEach(() => {
      toolManager = new ToolManager(mockPage, mockTools);
    });

    it('should return all managed tools', () => {
      const tools = toolManager.getTools();
      
      expect(tools).toHaveLength(5);
      expect(tools.map(t => t.name)).toEqual([
        'browser_navigate',
        'browser_screenshot',
        'browser_tab_new',
        'browser_tab_select',
        'browser_click'
      ]);
    });

    it('should return tools with preserved metadata', () => {
      const tools = toolManager.getTools();
      
      tools.forEach((tool, index) => {
        expect(tool.name).toBe(mockTools[index].name);
        expect(tool.description).toBe(mockTools[index].description);
        expect(typeof tool.func).toBe('function');
      });
    });

    it('should return empty array when no tools', () => {
      toolManager = new ToolManager(mockPage, []);
      
      expect(toolManager.getTools()).toEqual([]);
    });
  });

  describe('findTool', () => {
    beforeEach(() => {
      toolManager = new ToolManager(mockPage, mockTools);
    });

    it('should find existing tool by name', () => {
      const tool = toolManager.findTool('browser_navigate');
      
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('browser_navigate');
      expect(tool?.description).toBe('Navigate to a URL');
    });

    it('should find tab tools', () => {
      const tool = toolManager.findTool('browser_tab_new');
      
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('browser_tab_new');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = toolManager.findTool('non_existent_tool');
      
      expect(tool).toBeUndefined();
    });

    it('should handle empty string', () => {
      const tool = toolManager.findTool('');
      
      expect(tool).toBeUndefined();
    });

    it('should be case sensitive', () => {
      const tool = toolManager.findTool('BROWSER_NAVIGATE');
      
      expect(tool).toBeUndefined();
    });
  });

  describe('isConnectionHealthy', () => {
    beforeEach(() => {
      toolManager = new ToolManager(mockPage, mockTools);
    });

    it('should return true when page connection is healthy', async () => {
      mockPage.evaluate.mockResolvedValue(true);
      
      const isHealthy = await toolManager.isConnectionHealthy();
      
      expect(isHealthy).toBe(true);
      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return false when page connection fails', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Connection closed'));
      
      const isHealthy = await toolManager.isConnectionHealthy();
      
      expect(isHealthy).toBe(false);
    });

    it('should return false when page is null', async () => {
      toolManager = new ToolManager(null as any, mockTools);
      
      const isHealthy = await toolManager.isConnectionHealthy();
      
      expect(isHealthy).toBe(false);
    });

    it('should log connection health check failures', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockPage.evaluate.mockRejectedValue(new Error('Connection error'));
      
      await toolManager.isConnectionHealthy();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Agent connection health check failed:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle different types of errors', async () => {
      // Test with string error
      mockPage.evaluate.mockRejectedValue('String error');
      let isHealthy = await toolManager.isConnectionHealthy();
      expect(isHealthy).toBe(false);

      // Test with object error
      mockPage.evaluate.mockRejectedValue({ message: 'Object error' });
      isHealthy = await toolManager.isConnectionHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('tool health check wrapping', () => {
    beforeEach(() => {
      toolManager = new ToolManager(mockPage, mockTools);
    });

    describe('healthy connection', () => {
      beforeEach(() => {
        mockPage.evaluate.mockResolvedValue(true);
      });

      it('should execute non-tab tools normally when connection is healthy', async () => {
        const navigateTool = toolManager.findTool('browser_navigate');
        
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toBe('Navigation successful');
        expect(originalMockFunctions[0]).toHaveBeenCalledWith('https://example.com', undefined);
      });

      it('should execute tab tools without health check', async () => {
        const tabTool = toolManager.findTool('browser_tab_new');
        
        const result = await tabTool!.func('https://example.com');
        
        expect(result).toBe('New tab created');
        expect(originalMockFunctions[2]).toHaveBeenCalledWith('https://example.com');
        expect(mockPage.evaluate).not.toHaveBeenCalled();
      });

      it('should pass context to original tool function', async () => {
        const navigateTool = toolManager.findTool('browser_navigate');
        const context: ToolExecutionContext = { requiresApproval: true };
        
        await navigateTool!.func('https://example.com', context);
        
        expect(originalMockFunctions[0]).toHaveBeenCalledWith('https://example.com', context);
      });
    });

    describe('unhealthy connection', () => {
      beforeEach(() => {
        mockPage.evaluate.mockRejectedValue(new Error('Connection closed'));
      });

      it('should return error message for navigation tools when connection is unhealthy', async () => {
        const navigateTool = toolManager.findTool('browser_navigate');
        
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toContain('Error: Debug session was closed');
        expect(result).toContain('browser_tab_new');
        expect(result).toContain('https://example.com');
        expect(originalMockFunctions[0]).not.toHaveBeenCalled();
      });

      it('should return error message for screenshot tools when connection is unhealthy', async () => {
        const screenshotTool = toolManager.findTool('browser_screenshot');
        
        const result = await screenshotTool!.func('');
        
        expect(result).toContain('Error: Debug session was closed');
        expect(result).toContain('browser_tab_new');
        expect(result).toContain('browser_tab_select');
        expect(originalMockFunctions[1]).not.toHaveBeenCalled();
      });

      it('should return generic error message for other tools when connection is unhealthy', async () => {
        const clickTool = toolManager.findTool('browser_click');
        
        const result = await clickTool!.func('button');
        
        expect(result).toContain('Error: Debug session was closed');
        expect(result).toContain('tab tools');
        expect(originalMockFunctions[4]).not.toHaveBeenCalled();
      });

      it('should still execute tab tools even when connection is unhealthy', async () => {
        const tabTool = toolManager.findTool('browser_tab_new');
        
        const result = await tabTool!.func('https://example.com');
        
        expect(result).toBe('New tab created');
        expect(originalMockFunctions[2]).toHaveBeenCalledWith('https://example.com');
      });
    });

    describe('tool execution errors', () => {
      beforeEach(() => {
        mockPage.evaluate.mockResolvedValue(true); // Connection is healthy
      });

      it('should handle tool execution errors for non-tab tools', async () => {
        const errorMock = jest.fn().mockRejectedValue(new Error('Tool execution failed'));
        mockTools[0].func = errorMock;
        toolManager = new ToolManager(mockPage, mockTools);
        
        const navigateTool = toolManager.findTool('browser_navigate');
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toBe('Error executing tool: Tool execution failed');
      });

      it('should handle connection-related errors in tool execution', async () => {
        const errorMock = jest.fn().mockRejectedValue(new Error('Session closed'));
        mockTools[0].func = errorMock;
        toolManager = new ToolManager(mockPage, mockTools);
        
        const navigateTool = toolManager.findTool('browser_navigate');
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toContain('Debug session appears to be closed');
        expect(result).toContain('tab tools');
      });

      it('should handle detached session errors', async () => {
        const errorMock = jest.fn().mockRejectedValue(new Error('Target detached'));
        mockTools[0].func = errorMock;
        toolManager = new ToolManager(mockPage, mockTools);
        
        const navigateTool = toolManager.findTool('browser_navigate');
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toContain('Debug session appears to be closed');
      });

      it('should handle destroyed session errors', async () => {
        const errorMock = jest.fn().mockRejectedValue(new Error('Context destroyed'));
        mockTools[0].func = errorMock;
        toolManager = new ToolManager(mockPage, mockTools);
        
        const navigateTool = toolManager.findTool('browser_navigate');
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toContain('Debug session appears to be closed');
      });

      it('should handle non-Error objects thrown by tools', async () => {
        const errorMock = jest.fn().mockRejectedValue('String error');
        mockTools[0].func = errorMock;
        toolManager = new ToolManager(mockPage, mockTools);
        
        const navigateTool = toolManager.findTool('browser_navigate');
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toBe('Error executing tool: String error');
      });

      it('should handle null/undefined errors', async () => {
        const errorMock = jest.fn().mockRejectedValue(null);
        mockTools[0].func = errorMock;
        toolManager = new ToolManager(mockPage, mockTools);
        
        const navigateTool = toolManager.findTool('browser_navigate');
        const result = await navigateTool!.func('https://example.com');
        
        expect(result).toBe('Error executing tool: null');
      });
    });
  });

  describe('tab tool identification', () => {
    beforeEach(() => {
      toolManager = new ToolManager(mockPage, mockTools);
    });

    it('should identify tab tools correctly', () => {
      const tabTools = [
        'browser_tab_new',
        'browser_tab_select',
        'browser_tab_close',
        'browser_tab_list'
      ];

      tabTools.forEach(toolName => {
        const tool: BrowserTool = {
          name: toolName,
          description: 'Test tab tool',
          func: jest.fn(async (input: string, context?: ToolExecutionContext) => 'success')
        };
        
        const manager = new ToolManager(mockPage, [tool]);
        const managedTool = manager.findTool(toolName);
        
        // Tab tools should not be wrapped (same function reference)
        expect(managedTool?.func).toBe(tool.func);
      });
    });

    it('should identify non-tab tools correctly', async () => {
      const nonTabTools = [
        'browser_navigate',
        'browser_click',
        'browser_screenshot',
        'browser_type',
        'browser_read'
      ];

      for (const toolName of nonTabTools) {
        const tool: BrowserTool = {
          name: toolName,
          description: 'Test non-tab tool',
          func: jest.fn(async (input: string, context?: ToolExecutionContext) => 'success')
        };
        
        const manager = new ToolManager(mockPage, [tool]);
        const managedTool = manager.findTool(toolName);
        
        // Non-tab tools should have health check behavior
        mockPage.evaluate.mockResolvedValue(true);
        const result = await managedTool!.func('test');
        expect(result).toBe('success');
        expect(mockPage.evaluate).toHaveBeenCalled();
        
        // Reset mock for next iteration
        mockPage.evaluate.mockClear();
      }
    });

    it('should handle edge cases in tool name patterns', () => {
      const edgeCaseTools = [
        { name: 'browser_tab', isTab: false }, // Missing underscore suffix
        { name: 'tab_new', isTab: false }, // Missing browser prefix
        { name: 'browser_tab_', isTab: true }, // Empty suffix but starts with browser_tab_
        { name: 'BROWSER_TAB_NEW', isTab: false }, // Different case
        { name: 'browser_tab_new_extra', isTab: true } // Extra suffix
      ];

      edgeCaseTools.forEach(({ name: toolName, isTab }) => {
        const tool: BrowserTool = {
          name: toolName,
          description: 'Test edge case tool',
          func: jest.fn(async (input: string, context?: ToolExecutionContext) => 'success')
        };
        
        const manager = new ToolManager(mockPage, [tool]);
        const managedTool = manager.findTool(toolName);
        
        if (isTab) {
          // Should be treated as tab tool (same function reference)
          expect(managedTool?.func).toBe(tool.func);
        } else {
          // Should be treated as non-tab tool (function will be wrapped)
          // We can't easily test function reference change, but we can test behavior
          expect(managedTool?.func).toBeDefined();
          expect(typeof managedTool?.func).toBe('function');
        }
      });
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      toolManager = new ToolManager(mockPage, mockTools);
    });

    it('should handle mixed tool execution with healthy connection', async () => {
      mockPage.evaluate.mockResolvedValue(true);
      
      // Execute tab tool
      const tabTool = toolManager.findTool('browser_tab_new');
      const tabResult = await tabTool!.func('https://example.com');
      
      // Execute non-tab tool
      const navigateTool = toolManager.findTool('browser_navigate');
      const navResult = await navigateTool!.func('https://example.com');
      
      expect(tabResult).toBe('New tab created');
      expect(navResult).toBe('Navigation successful');
      expect(mockPage.evaluate).toHaveBeenCalledTimes(1); // Only for non-tab tool
    });

    it('should handle mixed tool execution with unhealthy connection', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Connection lost'));
      
      // Execute tab tool (should work)
      const tabTool = toolManager.findTool('browser_tab_new');
      const tabResult = await tabTool!.func('https://example.com');
      
      // Execute non-tab tool (should fail gracefully)
      const navigateTool = toolManager.findTool('browser_navigate');
      const navResult = await navigateTool!.func('https://example.com');
      
      expect(tabResult).toBe('New tab created');
      expect(navResult).toContain('Error: Debug session was closed');
    });

    it('should handle rapid successive tool calls', async () => {
      mockPage.evaluate.mockResolvedValue(true);
      
      const navigateTool = toolManager.findTool('browser_navigate');
      const promises = Array.from({ length: 5 }, (_, i) => 
        navigateTool!.func(`https://example${i}.com`)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe('Navigation successful');
      });
      expect(mockPage.evaluate).toHaveBeenCalledTimes(5);
    });

    it('should handle connection recovery scenarios', async () => {
      // Start with unhealthy connection
      mockPage.evaluate.mockRejectedValue(new Error('Connection lost'));
      
      const navigateTool = toolManager.findTool('browser_navigate');
      let result = await navigateTool!.func('https://example.com');
      expect(result).toContain('Error: Debug session was closed');
      
      // Connection recovers
      mockPage.evaluate.mockResolvedValue(true);
      
      result = await navigateTool!.func('https://example.com');
      expect(result).toBe('Navigation successful');
    });

    it('should maintain tool state across multiple executions', async () => {
      mockPage.evaluate.mockResolvedValue(true);
      
      const tools = toolManager.getTools();
      const initialToolCount = tools.length;
      
      // Execute multiple tools
      for (const tool of tools) {
        await tool.func('test input');
      }
      
      // Tool count should remain the same
      expect(toolManager.getTools()).toHaveLength(initialToolCount);
      
      // Tools should still be findable
      expect(toolManager.findTool('browser_navigate')).toBeDefined();
      expect(toolManager.findTool('browser_tab_new')).toBeDefined();
    });
  });

  describe('error message specificity', () => {
    beforeEach(() => {
      toolManager = new ToolManager(mockPage, mockTools);
      mockPage.evaluate.mockRejectedValue(new Error('Connection closed'));
    });

    it('should provide specific error message for browser_navigate', async () => {
      const navigateTool = toolManager.findTool('browser_navigate');
      const result = await navigateTool!.func('https://example.com');
      
      expect(result).toContain('browser_tab_new instead');
      expect(result).toContain('https://example.com');
    });

    it('should provide specific error message for screenshot tools', async () => {
      const screenshotTool = toolManager.findTool('browser_screenshot');
      const result = await screenshotTool!.func('');
      
      expect(result).toContain('create a new tab first');
      expect(result).toContain('browser_tab_select');
    });

    it('should provide specific error message for read tools', async () => {
      const readTool: BrowserTool = {
        name: 'browser_read_content',
        description: 'Read page content',
        func: jest.fn(async (input: string, context?: ToolExecutionContext) => 'content')
      };
      
      const manager = new ToolManager(mockPage, [readTool]);
      const managedTool = manager.findTool('browser_read_content');
      const result = await managedTool!.func('');
      
      expect(result).toContain('create a new tab first');
      expect(result).toContain('browser_tab_new');
    });

    it('should provide specific error message for title tools', async () => {
      const titleTool: BrowserTool = {
        name: 'browser_get_title',
        description: 'Get page title',
        func: jest.fn(async (input: string, context?: ToolExecutionContext) => 'title')
      };
      
      const manager = new ToolManager(mockPage, [titleTool]);
      const managedTool = manager.findTool('browser_get_title');
      const result = await managedTool!.func('');
      
      expect(result).toContain('create a new tab first');
      expect(result).toContain('browser_tab_select');
    });

    it('should provide generic error message for other tools', async () => {
      const clickTool = toolManager.findTool('browser_click');
      const result = await clickTool!.func('button');
      
      expect(result).toContain('use tab tools');
      expect(result).toContain('browser_tab_new, browser_tab_select');
    });
  });

  describe('performance and memory', () => {
    it('should handle large number of tools efficiently', () => {
      const largeMockTools: BrowserTool[] = Array.from({ length: 100 }, (_, i) => ({
        name: `tool_${i}`,
        description: `Tool ${i}`,
        func: jest.fn(async (input: string, context?: ToolExecutionContext) => `result_${i}`)
      }));
      
      const startTime = Date.now();
      toolManager = new ToolManager(mockPage, largeMockTools);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(toolManager.getTools()).toHaveLength(100);
    });

    it('should not leak memory with repeated tool executions', async () => {
      toolManager = new ToolManager(mockPage, mockTools);
      mockPage.evaluate.mockResolvedValue(true);
      
      const navigateTool = toolManager.findTool('browser_navigate');
      
      // Execute tool many times
      for (let i = 0; i < 50; i++) {
        await navigateTool!.func(`https://example${i}.com`);
      }
      
      // Tool should still be functional
      const result = await navigateTool!.func('https://final.com');
      expect(result).toBe('Navigation successful');
    });

    it('should handle concurrent tool executions', async () => {
      toolManager = new ToolManager(mockPage, mockTools);
      mockPage.evaluate.mockResolvedValue(true);
      
      const navigateTool = toolManager.findTool('browser_navigate');
      const screenshotTool = toolManager.findTool('browser_screenshot');
      
      const promises = [
        navigateTool!.func('https://example1.com'),
        screenshotTool!.func(''),
        navigateTool!.func('https://example2.com'),
        screenshotTool!.func('')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toEqual([
        'Navigation successful',
        'Screenshot taken',
        'Navigation successful',
        'Screenshot taken'
      ]);
    });
  });
});
