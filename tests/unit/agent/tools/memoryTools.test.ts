import { jest } from '@jest/globals';
import { createMockPage, mockChromeAPIs, mockPageContextManager } from '../../../mocks/playwright';

// Mock dependencies before importing the tools
jest.mock('../../../../src/agent/PageContextManager', () => mockPageContextManager);

// Mock Chrome APIs
global.chrome = mockChromeAPIs as any;

// Mock the utils module
jest.mock('../../../../src/agent/tools/utils', () => ({
  withActivePage: jest.fn().mockImplementation((page: any, fn: any) => fn(page)),
}));

// Mock the background utils
jest.mock('../../../../src/background/utils', () => ({
  logWithTimestamp: jest.fn(),
}));

// Mock the domain utils
jest.mock('../../../../src/tracking/domainUtils', () => ({
  normalizeDomain: jest.fn().mockImplementation((...args: any[]) => {
    const domain = args[0] as string;
    if (!domain) return '';
    return domain.toLowerCase().replace(/^www\./, '');
  }),
}));

// Mock the memory service
const mockMemoryService = {
  getInstance: jest.fn(),
  storeMemory: jest.fn() as jest.MockedFunction<any>,
  getMemoriesByDomain: jest.fn() as jest.MockedFunction<any>,
  getAllMemories: jest.fn() as jest.MockedFunction<any>,
  deleteMemory: jest.fn() as jest.MockedFunction<any>,
  clearMemories: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('../../../../src/tracking/memoryService', () => ({
  MemoryService: {
    getInstance: () => mockMemoryService,
  },
}));

// Import the tools after mocking dependencies
import {
  saveMemory,
  lookupMemories,
  getAllMemories,
  deleteMemory,
  clearAllMemories
} from '../../../../src/agent/tools/memoryTools';

describe('Memory Tools', () => {
  let mockPage: any;

  beforeEach(() => {
    mockPage = createMockPage();
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockMemoryService.storeMemory.mockResolvedValue(1);
    mockMemoryService.getMemoriesByDomain.mockResolvedValue([]);
    mockMemoryService.getAllMemories.mockResolvedValue([]);
    mockMemoryService.deleteMemory.mockResolvedValue(undefined);
    mockMemoryService.clearMemories.mockResolvedValue(undefined);
  });

  describe('saveMemory', () => {
    it('should save a memory successfully', async () => {
      const tool = saveMemory(mockPage);
      const input = JSON.stringify({
        domain: 'example.com',
        taskDescription: 'Login to website',
        toolSequence: ['browser_click', 'browser_fill', 'browser_click']
      });

      mockMemoryService.storeMemory.mockResolvedValue(123);

      const result = await tool.func(input);

      expect(result).toBe('Memory saved successfully with ID: 123');
      expect(mockMemoryService.storeMemory).toHaveBeenCalledWith({
        domain: 'example.com',
        taskDescription: 'Login to website',
        toolSequence: ['browser_click', 'browser_fill', 'browser_click'],
        createdAt: expect.any(Number)
      });
    });

    it('should normalize domain before saving', async () => {
      const tool = saveMemory(mockPage);
      const input = JSON.stringify({
        domain: 'www.example.com',
        taskDescription: 'Test task',
        toolSequence: ['browser_click']
      });

      const result = await tool.func(input);

      expect(result).toBe('Memory saved successfully with ID: 1');
      expect(mockMemoryService.storeMemory).toHaveBeenCalledWith({
        domain: 'example.com', // Should be normalized
        taskDescription: 'Test task',
        toolSequence: ['browser_click'],
        createdAt: expect.any(Number)
      });
    });

    it('should handle missing required fields', async () => {
      const tool = saveMemory(mockPage);
      const input = JSON.stringify({
        domain: 'example.com',
        taskDescription: 'Test task'
        // Missing toolSequence
      });

      const result = await tool.func(input);

      expect(result).toBe('Error: Missing required fields. Please provide domain, taskDescription, and toolSequence.');
      expect(mockMemoryService.storeMemory).not.toHaveBeenCalled();
    });

    it('should handle empty domain as missing field', async () => {
      const tool = saveMemory(mockPage);
      const input = JSON.stringify({
        domain: '',
        taskDescription: 'Test task',
        toolSequence: ['browser_click']
      });

      const result = await tool.func(input);

      expect(result).toBe('Error: Missing required fields. Please provide domain, taskDescription, and toolSequence.');
      expect(mockMemoryService.storeMemory).not.toHaveBeenCalled();
    });

    it('should handle invalid domain after normalization', async () => {
      const tool = saveMemory(mockPage);
      const { normalizeDomain } = require('../../../../src/tracking/domainUtils');
      
      // Mock normalizeDomain to return empty string for this test
      normalizeDomain.mockReturnValueOnce('');
      
      const input = JSON.stringify({
        domain: 'invalid-domain',
        taskDescription: 'Test task',
        toolSequence: ['browser_click']
      });

      const result = await tool.func(input);

      expect(result).toBe('Error: Invalid domain provided.');
      expect(mockMemoryService.storeMemory).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON input', async () => {
      const tool = saveMemory(mockPage);
      const input = 'invalid json';

      const result = await tool.func(input);

      expect(result).toContain('Error saving memory:');
      expect(mockMemoryService.storeMemory).not.toHaveBeenCalled();
    });

    it('should handle memory service errors', async () => {
      const tool = saveMemory(mockPage);
      const input = JSON.stringify({
        domain: 'example.com',
        taskDescription: 'Test task',
        toolSequence: ['browser_click']
      });

      mockMemoryService.storeMemory.mockRejectedValue(new Error('Database error'));

      const result = await tool.func(input);

      expect(result).toBe('Error saving memory: Database error');
    });

    it('should save complex tool sequences', async () => {
      const tool = saveMemory(mockPage);
      const input = JSON.stringify({
        domain: 'complex-site.com',
        taskDescription: 'Complete multi-step form',
        toolSequence: [
          'browser_click|button[data-action="start"]',
          'browser_fill|input[name="email"]|test@example.com',
          'browser_select|select[name="country"]|US',
          'browser_click|button[type="submit"]'
        ]
      });

      const result = await tool.func(input);

      expect(result).toBe('Memory saved successfully with ID: 1');
      expect(mockMemoryService.storeMemory).toHaveBeenCalledWith({
        domain: 'complex-site.com',
        taskDescription: 'Complete multi-step form',
        toolSequence: [
          'browser_click|button[data-action="start"]',
          'browser_fill|input[name="email"]|test@example.com',
          'browser_select|select[name="country"]|US',
          'browser_click|button[type="submit"]'
        ],
        createdAt: expect.any(Number)
      });
    });
  });

  describe('lookupMemories', () => {
    it('should lookup memories for a domain', async () => {
      const tool = lookupMemories(mockPage);
      const mockMemories = [
        {
          domain: 'example.com',
          taskDescription: 'Login process',
          toolSequence: ['browser_click', 'browser_fill'],
          createdAt: 1640995200000
        },
        {
          domain: 'example.com',
          taskDescription: 'Search functionality',
          toolSequence: ['browser_fill', 'browser_click'],
          createdAt: 1640995300000
        }
      ];

      mockMemoryService.getMemoriesByDomain.mockResolvedValue(mockMemories);

      const result = await tool.func('example.com');

      expect(result).toContain('Login process');
      expect(result).toContain('Search functionality');
      expect(mockMemoryService.getMemoriesByDomain).toHaveBeenCalledWith('example.com');
    });

    it('should normalize domain for lookup', async () => {
      const tool = lookupMemories(mockPage);
      mockMemoryService.getMemoriesByDomain.mockResolvedValue([]);

      await tool.func('www.example.com');

      expect(mockMemoryService.getMemoriesByDomain).toHaveBeenCalledWith('example.com');
    });

    it('should handle no memories found', async () => {
      const tool = lookupMemories(mockPage);
      mockMemoryService.getMemoriesByDomain.mockResolvedValue([]);

      const result = await tool.func('example.com');

      expect(result).toBe('No memories found for domain: example.com');
    });

    it('should sort memories by creation date (newest first)', async () => {
      const tool = lookupMemories(mockPage);
      const mockMemories = [
        {
          domain: 'example.com',
          taskDescription: 'Older task',
          toolSequence: ['browser_click'],
          createdAt: 1640995200000
        },
        {
          domain: 'example.com',
          taskDescription: 'Newer task',
          toolSequence: ['browser_fill'],
          createdAt: 1640995300000
        }
      ];

      mockMemoryService.getMemoriesByDomain.mockResolvedValue(mockMemories);

      const result = await tool.func('example.com');
      const parsedResult = JSON.parse(result);

      expect(parsedResult[0].taskDescription).toBe('Newer task');
      expect(parsedResult[1].taskDescription).toBe('Older task');
    });

    it('should handle invalid domain', async () => {
      const tool = lookupMemories(mockPage);

      const result = await tool.func('');

      expect(result).toBe('Error: Please provide a valid domain to lookup memories for.');
      expect(mockMemoryService.getMemoriesByDomain).not.toHaveBeenCalled();
    });

    it('should handle memory service errors', async () => {
      const tool = lookupMemories(mockPage);
      mockMemoryService.getMemoriesByDomain.mockRejectedValue(new Error('Database error'));

      const result = await tool.func('example.com');

      expect(result).toBe('Error looking up memories: Database error');
    });

    it('should handle memories without creation date', async () => {
      const tool = lookupMemories(mockPage);
      const mockMemories = [
        {
          domain: 'example.com',
          taskDescription: 'Task without date',
          toolSequence: ['browser_click']
          // No createdAt field
        }
      ];

      mockMemoryService.getMemoriesByDomain.mockResolvedValue(mockMemories);

      const result = await tool.func('example.com');
      const parsedResult = JSON.parse(result);

      expect(parsedResult[0].createdAt).toBe('unknown');
    });
  });

  describe('getAllMemories', () => {
    it('should retrieve all memories', async () => {
      const tool = getAllMemories(mockPage);
      const mockMemories = [
        {
          domain: 'example.com',
          taskDescription: 'Task 1',
          toolSequence: ['browser_click']
        },
        {
          domain: 'another.com',
          taskDescription: 'Task 2',
          toolSequence: ['browser_fill']
        }
      ];

      mockMemoryService.getAllMemories.mockResolvedValue(mockMemories);

      const result = await tool.func();

      expect(result).toContain('Task 1');
      expect(result).toContain('Task 2');
      expect(mockMemoryService.getAllMemories).toHaveBeenCalled();
    });

    it('should handle no memories found', async () => {
      const tool = getAllMemories(mockPage);
      mockMemoryService.getAllMemories.mockResolvedValue([]);

      const result = await tool.func();

      expect(result).toBe('No memories found.');
    });

    it('should handle memory service errors', async () => {
      const tool = getAllMemories(mockPage);
      mockMemoryService.getAllMemories.mockRejectedValue(new Error('Database error'));

      const result = await tool.func();

      expect(result).toBe('Error retrieving all memories: Database error');
    });

    it('should return properly formatted JSON', async () => {
      const tool = getAllMemories(mockPage);
      const mockMemories = [
        {
          id: 1,
          domain: 'example.com',
          taskDescription: 'Test task',
          toolSequence: ['browser_click'],
          createdAt: 1640995200000
        }
      ];

      mockMemoryService.getAllMemories.mockResolvedValue(mockMemories);

      const result = await tool.func();
      
      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].domain).toBe('example.com');
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory by ID', async () => {
      const tool = deleteMemory(mockPage);

      const result = await tool.func('123');

      expect(result).toBe('Memory with ID 123 deleted successfully.');
      expect(mockMemoryService.deleteMemory).toHaveBeenCalledWith(123);
    });

    it('should handle invalid ID format', async () => {
      const tool = deleteMemory(mockPage);

      const result = await tool.func('invalid');

      expect(result).toBe('Error: Please provide a valid numeric ID.');
      expect(mockMemoryService.deleteMemory).not.toHaveBeenCalled();
    });

    it('should handle empty input', async () => {
      const tool = deleteMemory(mockPage);

      const result = await tool.func('');

      expect(result).toBe('Error: Please provide a valid numeric ID.');
      expect(mockMemoryService.deleteMemory).not.toHaveBeenCalled();
    });

    it('should handle memory service errors', async () => {
      const tool = deleteMemory(mockPage);
      mockMemoryService.deleteMemory.mockRejectedValue(new Error('Memory not found'));

      const result = await tool.func('123');

      expect(result).toBe('Error deleting memory: Memory not found');
    });

    it('should handle whitespace in input', async () => {
      const tool = deleteMemory(mockPage);

      const result = await tool.func('  456  ');

      expect(result).toBe('Memory with ID 456 deleted successfully.');
      expect(mockMemoryService.deleteMemory).toHaveBeenCalledWith(456);
    });

    it('should handle negative IDs', async () => {
      const tool = deleteMemory(mockPage);

      const result = await tool.func('-1');

      expect(result).toBe('Memory with ID -1 deleted successfully.');
      expect(mockMemoryService.deleteMemory).toHaveBeenCalledWith(-1);
    });
  });

  describe('clearAllMemories', () => {
    it('should clear all memories', async () => {
      const tool = clearAllMemories(mockPage);

      const result = await tool.func();

      expect(result).toBe('All memories cleared successfully.');
      expect(mockMemoryService.clearMemories).toHaveBeenCalled();
    });

    it('should handle memory service errors', async () => {
      const tool = clearAllMemories(mockPage);
      mockMemoryService.clearMemories.mockRejectedValue(new Error('Database error'));

      const result = await tool.func();

      expect(result).toBe('Error clearing memories: Database error');
    });
  });

  describe('Tool Integration', () => {
    it('should handle complete memory workflow', async () => {
      const saveMemoryTool = saveMemory(mockPage);
      const lookupMemoriesTool = lookupMemories(mockPage);
      const deleteMemoryTool = deleteMemory(mockPage);

      // Save a memory
      const saveInput = JSON.stringify({
        domain: 'workflow.com',
        taskDescription: 'Complete workflow',
        toolSequence: ['browser_click', 'browser_fill']
      });

      mockMemoryService.storeMemory.mockResolvedValue(999);
      const saveResult = await saveMemoryTool.func(saveInput);
      expect(saveResult).toBe('Memory saved successfully with ID: 999');

      // Lookup memories
      const mockMemories = [{
        domain: 'workflow.com',
        taskDescription: 'Complete workflow',
        toolSequence: ['browser_click', 'browser_fill'],
        createdAt: Date.now()
      }];
      mockMemoryService.getMemoriesByDomain.mockResolvedValue(mockMemories);
      
      const lookupResult = await lookupMemoriesTool.func('workflow.com');
      expect(lookupResult).toContain('Complete workflow');

      // Delete the memory
      const deleteResult = await deleteMemoryTool.func('999');
      expect(deleteResult).toBe('Memory with ID 999 deleted successfully.');
    });

    it('should handle domain normalization consistently', async () => {
      const saveMemoryTool = saveMemory(mockPage);
      const lookupMemoriesTool = lookupMemories(mockPage);

      // Save with www prefix
      const saveInput = JSON.stringify({
        domain: 'www.test.com',
        taskDescription: 'Test task',
        toolSequence: ['browser_click']
      });

      await saveMemoryTool.func(saveInput);
      expect(mockMemoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'test.com' })
      );

      // Lookup without www prefix
      await lookupMemoriesTool.func('test.com');
      expect(mockMemoryService.getMemoriesByDomain).toHaveBeenCalledWith('test.com');
    });

    it('should handle error scenarios gracefully', async () => {
      const saveMemoryTool = saveMemory(mockPage);
      const lookupMemoriesTool = lookupMemories(mockPage);

      // Test save with service error
      mockMemoryService.storeMemory.mockRejectedValue(new Error('Storage full'));
      const saveInput = JSON.stringify({
        domain: 'error.com',
        taskDescription: 'Error test',
        toolSequence: ['browser_click']
      });

      const saveResult = await saveMemoryTool.func(saveInput);
      expect(saveResult).toBe('Error saving memory: Storage full');

      // Test lookup with service error
      mockMemoryService.getMemoriesByDomain.mockRejectedValue(new Error('Connection lost'));
      const lookupResult = await lookupMemoriesTool.func('error.com');
      expect(lookupResult).toBe('Error looking up memories: Connection lost');
    });
  });
});
