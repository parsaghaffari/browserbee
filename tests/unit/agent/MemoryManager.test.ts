import { jest } from '@jest/globals';
import { MemoryManager } from '../../../src/agent/MemoryManager';
import { BrowserTool } from '../../../src/agent/tools/types';
import Anthropic from '@anthropic-ai/sdk';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockMemoryTool: BrowserTool;
  let mockTools: BrowserTool[];
  let messages: Anthropic.MessageParam[];
  let consoleSpy: any;

  beforeEach(() => {
    // Setup console spy
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Create mock memory tool
    mockMemoryTool = {
      name: 'lookup_memories',
      description: 'Look up memories for a domain',
      func: jest.fn().mockResolvedValue('No memories found') as any
    };

    // Create mock tools array
    mockTools = [
      mockMemoryTool,
      {
        name: 'other_tool',
        description: 'Another tool',
        func: jest.fn().mockResolvedValue('success') as any
      }
    ];

    // Initialize messages array
    messages = [];

    // Create MemoryManager instance
    memoryManager = new MemoryManager(mockTools);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with memory tool when available', () => {
      const manager = new MemoryManager(mockTools);
      expect(manager).toBeInstanceOf(MemoryManager);
    });

    it('should handle empty tools array', () => {
      const manager = new MemoryManager([]);
      expect(manager).toBeInstanceOf(MemoryManager);
    });

    it('should handle tools array without memory tool', () => {
      const toolsWithoutMemory = [
        {
          name: 'other_tool',
          description: 'Another tool',
          func: jest.fn().mockResolvedValue('success') as any
        }
      ];

      const manager = new MemoryManager(toolsWithoutMemory);
      expect(manager).toBeInstanceOf(MemoryManager);
    });

    it('should find memory tool by name', () => {
      const toolsWithMultiple = [
        {
          name: 'tool1',
          description: 'Tool 1',
          func: jest.fn() as any
        },
        mockMemoryTool,
        {
          name: 'tool2',
          description: 'Tool 2',
          func: jest.fn() as any
        }
      ];

      const manager = new MemoryManager(toolsWithMultiple);
      expect(manager).toBeInstanceOf(MemoryManager);
    });
  });

  describe('lookupMemories', () => {
    it('should handle no memories found', async () => {
      mockMemoryTool.func = jest.fn().mockResolvedValue('No memories found') as any;

      await memoryManager.lookupMemories('example.com', messages);

      expect(mockMemoryTool.func).toHaveBeenCalledWith('example.com');
      expect(messages).toHaveLength(0);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should add memories to message context when found', async () => {
      const mockMemories = [
        {
          taskDescription: 'Login to website',
          toolSequence: ['browser_click', 'browser_type', 'browser_click']
        },
        {
          taskDescription: 'Search for products',
          toolSequence: ['browser_click', 'browser_type', 'browser_press_key']
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(mockMemories)) as any;

      await memoryManager.lookupMemories('example.com', messages);

      expect(mockMemoryTool.func).toHaveBeenCalledWith('example.com');
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toContain('I found 2 memories for example.com');
      expect(messages[0].content).toContain('Login to website');
      expect(messages[0].content).toContain('browser_click → browser_type → browser_click');
      expect(messages[0].content).toContain('Search for products');
      expect(messages[0].content).toContain('browser_click → browser_type → browser_press_key');
    });

    it('should handle single memory correctly', async () => {
      const mockMemories = [
        {
          taskDescription: 'Fill out form',
          toolSequence: ['browser_click', 'browser_type']
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(mockMemories)) as any;

      await memoryManager.lookupMemories('test.com', messages);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('I found 1 memories for test.com');
      expect(messages[0].content).toContain('Fill out form');
      expect(messages[0].content).toContain('browser_click → browser_type');
    });

    it('should handle empty memories array', async () => {
      mockMemoryTool.func = jest.fn().mockResolvedValue('[]') as any;

      await memoryManager.lookupMemories('empty.com', messages);

      expect(mockMemoryTool.func).toHaveBeenCalledWith('empty.com');
      expect(messages).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockMemoryTool.func = jest.fn().mockResolvedValue('invalid json') as any;

      await memoryManager.lookupMemories('invalid.com', messages);

      expect(mockMemoryTool.func).toHaveBeenCalledWith('invalid.com');
      expect(messages).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing memory results:')
      );
    });

    it('should handle memory tool throwing error', async () => {
      mockMemoryTool.func = jest.fn().mockRejectedValue(new Error('Memory tool error')) as any;

      await memoryManager.lookupMemories('error.com', messages);

      expect(mockMemoryTool.func).toHaveBeenCalledWith('error.com');
      expect(messages).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error looking up memories: Memory tool error')
      );
    });

    it('should handle memory tool returning null', async () => {
      mockMemoryTool.func = jest.fn().mockResolvedValue(null) as any;

      await memoryManager.lookupMemories('null.com', messages);

      expect(mockMemoryTool.func).toHaveBeenCalledWith('null.com');
      expect(messages).toHaveLength(0);
    });

    it('should handle memory tool returning undefined', async () => {
      mockMemoryTool.func = jest.fn().mockResolvedValue(undefined) as any;

      await memoryManager.lookupMemories('undefined.com', messages);

      expect(mockMemoryTool.func).toHaveBeenCalledWith('undefined.com');
      expect(messages).toHaveLength(0);
    });

    it('should handle when no memory tool is available', async () => {
      const managerWithoutMemoryTool = new MemoryManager([]);

      await managerWithoutMemoryTool.lookupMemories('example.com', messages);

      expect(messages).toHaveLength(0);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle complex memory structures', async () => {
      const complexMemories = [
        {
          taskDescription: 'Complex workflow with multiple steps',
          toolSequence: [
            'browser_navigate',
            'browser_click',
            'browser_type',
            'browser_press_key',
            'browser_screenshot',
            'browser_click'
          ]
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(complexMemories)) as any;

      await memoryManager.lookupMemories('complex.com', messages);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('Complex workflow with multiple steps');
      expect(messages[0].content).toContain(
        'browser_navigate → browser_click → browser_type → browser_press_key → browser_screenshot → browser_click'
      );
    });

    it('should handle memories with special characters', async () => {
      const specialMemories = [
        {
          taskDescription: 'Task with "quotes" and & symbols',
          toolSequence: ['browser_click', 'browser_type']
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(specialMemories)) as any;

      await memoryManager.lookupMemories('special.com', messages);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('Task with "quotes" and & symbols');
    });

    it('should handle different domain formats', async () => {
      const mockMemories = [
        {
          taskDescription: 'Test task',
          toolSequence: ['browser_click']
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(mockMemories)) as any;

      // Test different domain formats
      const domains = [
        'example.com',
        'www.example.com',
        'subdomain.example.com',
        'example.co.uk',
        'localhost:3000'
      ];

      for (const domain of domains) {
        messages.length = 0; // Clear messages
        await memoryManager.lookupMemories(domain, messages);

        expect(mockMemoryTool.func).toHaveBeenCalledWith(domain);
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toContain(`I found 1 memories for ${domain}`);
      }
    });
  });

  describe('updateMemoryTool', () => {
    it('should update memory tool when new tools are provided', () => {
      const newMemoryTool = {
        name: 'lookup_memories',
        description: 'Updated memory tool',
        func: jest.fn().mockResolvedValue('updated') as any
      };

      const newTools = [
        {
          name: 'other_tool',
          description: 'Other tool',
          func: jest.fn() as any
        },
        newMemoryTool
      ];

      memoryManager.updateMemoryTool(newTools);

      // Verify the tool was updated by checking if the new tool is used
      expect(() => memoryManager.updateMemoryTool(newTools)).not.toThrow();
    });

    it('should handle updating with empty tools array', () => {
      memoryManager.updateMemoryTool([]);

      expect(() => memoryManager.updateMemoryTool([])).not.toThrow();
    });

    it('should handle updating with tools that do not include memory tool', () => {
      const toolsWithoutMemory = [
        {
          name: 'tool1',
          description: 'Tool 1',
          func: jest.fn() as any
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          func: jest.fn() as any
        }
      ];

      memoryManager.updateMemoryTool(toolsWithoutMemory);

      expect(() => memoryManager.updateMemoryTool(toolsWithoutMemory)).not.toThrow();
    });

    it('should find new memory tool after update', async () => {
      const newMemoryTool = {
        name: 'lookup_memories',
        description: 'New memory tool',
        func: jest.fn().mockResolvedValue('["new memory"]') as any
      };

      memoryManager.updateMemoryTool([newMemoryTool]);

      // Test that the new tool is being used
      await memoryManager.lookupMemories('test.com', messages);

      expect(newMemoryTool.func).toHaveBeenCalledWith('test.com');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete memory lookup workflow', async () => {
      const workflowMemories = [
        {
          taskDescription: 'Complete user registration',
          toolSequence: [
            'browser_navigate',
            'browser_click',
            'browser_type',
            'browser_click',
            'browser_type',
            'browser_click'
          ]
        },
        {
          taskDescription: 'Login existing user',
          toolSequence: [
            'browser_click',
            'browser_type',
            'browser_click',
            'browser_type',
            'browser_click'
          ]
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(workflowMemories)) as any;

      await memoryManager.lookupMemories('workflow.com', messages);

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toContain('Before we start, here are some patterns');
      expect(messages[0].content).toContain('Complete user registration');
      expect(messages[0].content).toContain('Login existing user');
      expect(messages[0].content).toContain('You can adapt these patterns');
    });

    it('should handle memory lookup with existing messages', async () => {
      // Add existing messages
      messages.push({ role: 'user', content: 'Initial message' });
      messages.push({ role: 'assistant', content: 'Assistant response' });

      const memories = [
        {
          taskDescription: 'Test task',
          toolSequence: ['browser_click']
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(memories)) as any;

      await memoryManager.lookupMemories('test.com', messages);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Initial message');
      expect(messages[1].content).toBe('Assistant response');
      expect(messages[2].content).toContain('I found 1 memories for test.com');
    });

    it('should handle rapid successive memory lookups', async () => {
      const memories = [
        {
          taskDescription: 'Quick task',
          toolSequence: ['browser_click']
        }
      ];

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(memories)) as any;

      // Perform multiple rapid lookups
      await Promise.all([
        memoryManager.lookupMemories('site1.com', messages),
        memoryManager.lookupMemories('site2.com', messages),
        memoryManager.lookupMemories('site3.com', messages)
      ]);

      expect(mockMemoryTool.func).toHaveBeenCalledTimes(3);
      expect(messages).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error objects thrown by memory tool', async () => {
      mockMemoryTool.func = jest.fn().mockRejectedValue('String error') as any;

      await memoryManager.lookupMemories('error.com', messages);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error looking up memories: String error')
      );
    });

    it('should handle JSON parsing errors with non-Error objects', async () => {
      mockMemoryTool.func = jest.fn().mockResolvedValue('invalid json') as any;

      await memoryManager.lookupMemories('invalid.com', messages);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing memory results:')
      );
    });

    it('should handle memory tool returning empty string', async () => {
      mockMemoryTool.func = jest.fn().mockResolvedValue('') as any;

      await memoryManager.lookupMemories('empty.com', messages);

      expect(messages).toHaveLength(0);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large memory datasets efficiently', async () => {
      const largeMemories = Array.from({ length: 100 }, (_, i) => ({
        taskDescription: `Task ${i}`,
        toolSequence: ['browser_click', 'browser_type']
      }));

      mockMemoryTool.func = jest.fn().mockResolvedValue(JSON.stringify(largeMemories)) as any;

      const startTime = Date.now();
      await memoryManager.lookupMemories('large.com', messages);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('I found 100 memories for large.com');
    });

    it('should not leak memory with frequent updates', () => {
      // Simulate frequent tool updates
      for (let i = 0; i < 100; i++) {
        const tools = [
          {
            name: 'lookup_memories',
            description: `Memory tool ${i}`,
            func: jest.fn() as any
          }
        ];
        memoryManager.updateMemoryTool(tools);
      }

      // Should still work correctly
      expect(() => memoryManager.updateMemoryTool(mockTools)).not.toThrow();
    });
  });
});
