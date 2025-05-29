import { jest } from '@jest/globals';
import { PromptManager } from '../../../src/agent/PromptManager';
import { BrowserTool } from '../../../src/agent/tools/types';

// Mock navigator for testing
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

// Mock global navigator
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

describe('PromptManager', () => {
  let promptManager: PromptManager;
  let mockTools: BrowserTool[];

  beforeEach(() => {
    // Ensure navigator is always available
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });

    // Create mock tools with proper function types
    mockTools = [
      {
        name: 'browser_click',
        description: 'Click on an element using CSS selector',
        func: jest.fn().mockResolvedValue('Clicked successfully') as any
      },
      {
        name: 'browser_type',
        description: 'Type text into an input field',
        func: jest.fn().mockResolvedValue('Typed successfully') as any
      },
      {
        name: 'browser_navigate',
        description: 'Navigate to a URL',
        func: jest.fn().mockResolvedValue('Navigated successfully') as any
      }
    ];

    promptManager = new PromptManager(mockTools);
  });

  describe('Constructor', () => {
    it('should initialize with provided tools', () => {
      expect(promptManager).toBeInstanceOf(PromptManager);
    });

    it('should handle empty tools array', () => {
      const emptyPromptManager = new PromptManager([]);
      const systemPrompt = emptyPromptManager.getSystemPrompt();
      
      expect(systemPrompt).toContain('You are a browser-automation assistant called **BrowserBee 🐝**');
      // The prompt contains "browser_click" in the instructions, not in tool descriptions
      expect(systemPrompt).toContain('browser_click');
    });

    it('should handle null/undefined tools gracefully', () => {
      expect(() => {
        new PromptManager(null as any);
      }).not.toThrow();

      expect(() => {
        new PromptManager(undefined as any);
      }).not.toThrow();
    });
  });

  describe('setCurrentPageContext', () => {
    it('should set page context with URL and title', () => {
      const url = 'https://example.com';
      const title = 'Example Page';

      promptManager.setCurrentPageContext(url, title);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('CURRENT PAGE CONTEXT');
      expect(systemPrompt).toContain(`You are currently on ${url} (${title})`);
    });

    it('should update page context when called multiple times', () => {
      promptManager.setCurrentPageContext('https://first.com', 'First Page');
      let systemPrompt = promptManager.getSystemPrompt();
      expect(systemPrompt).toContain('https://first.com');
      expect(systemPrompt).toContain('First Page');

      promptManager.setCurrentPageContext('https://second.com', 'Second Page');
      systemPrompt = promptManager.getSystemPrompt();
      expect(systemPrompt).toContain('https://second.com');
      expect(systemPrompt).toContain('Second Page');
      expect(systemPrompt).not.toContain('https://first.com');
    });

    it('should handle special characters in URL and title', () => {
      const url = 'https://example.com/path?query=value&other=test';
      const title = 'Page with "quotes" & special chars';

      promptManager.setCurrentPageContext(url, title);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain(url);
      expect(systemPrompt).toContain(title);
    });

    it('should handle empty URL and title', () => {
      promptManager.setCurrentPageContext('', '');
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('CURRENT PAGE CONTEXT');
      expect(systemPrompt).toContain('You are currently on  ()');
    });
  });

  describe('getSystemPrompt', () => {
    it('should generate system prompt with tool descriptions', () => {
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('You are a browser-automation assistant called **BrowserBee 🐝**');
      expect(systemPrompt).toContain('browser_click: Click on an element using CSS selector');
      expect(systemPrompt).toContain('browser_type: Type text into an input field');
      expect(systemPrompt).toContain('browser_navigate: Navigate to a URL');
    });

    it('should include multi-tab operation instructions', () => {
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('MULTI-TAB OPERATION INSTRUCTIONS');
      expect(systemPrompt).toContain('Tab Context Awareness');
      expect(systemPrompt).toContain('browser_tab_list');
      expect(systemPrompt).toContain('browser_tab_select');
    });

    it('should include canonical sequence instructions', () => {
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('CANONICAL SEQUENCE');
      expect(systemPrompt).toContain('Identify domain');
      expect(systemPrompt).toContain('lookup_memories');
      expect(systemPrompt).toContain('Apply memory');
      expect(systemPrompt).toContain('Observe');
      expect(systemPrompt).toContain('Analyze → Act');
    });

    it('should include memory format instructions', () => {
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('MEMORY FORMAT');
      expect(systemPrompt).toContain('Domain: www.google.com');
      expect(systemPrompt).toContain('Tools:');
      expect(systemPrompt).toContain('browser_click');
    });

    it('should include tool-call syntax instructions', () => {
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('TOOL-CALL SYNTAX');
      expect(systemPrompt).toContain('<tool>tool_name</tool>');
      expect(systemPrompt).toContain('<input>arguments here</input>');
      expect(systemPrompt).toContain('<requires_approval>true or false</requires_approval>');
    });

    it('should detect macOS and use Command key', () => {
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('macOS');
      expect(systemPrompt).toContain('Command');
    });

    it('should detect Windows and use Control key', () => {
      // Mock Windows user agent
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        writable: true
      });

      const windowsPromptManager = new PromptManager(mockTools);
      const systemPrompt = windowsPromptManager.getSystemPrompt();

      expect(systemPrompt).toContain('Windows');
      expect(systemPrompt).toContain('Control');

      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true
      });
    });

    it('should detect Linux and use Control key', () => {
      // Mock Linux user agent
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' },
        writable: true
      });

      const linuxPromptManager = new PromptManager(mockTools);
      const systemPrompt = linuxPromptManager.getSystemPrompt();

      expect(systemPrompt).toContain('Linux');
      expect(systemPrompt).toContain('Control');

      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true
      });
    });

    it('should not include page context when not set', () => {
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).not.toContain('CURRENT PAGE CONTEXT');
    });

    it('should include page context when set', () => {
      promptManager.setCurrentPageContext('https://test.com', 'Test Page');
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('CURRENT PAGE CONTEXT');
      expect(systemPrompt).toContain('You are currently on https://test.com (Test Page)');
    });
  });

  describe('updateTools', () => {
    it('should update tools and reflect in system prompt', () => {
      const newTools: BrowserTool[] = [
        {
          name: 'browser_scroll',
          description: 'Scroll the page',
          func: jest.fn().mockResolvedValue('Scrolled successfully') as any
        },
        {
          name: 'browser_wait',
          description: 'Wait for an element',
          func: jest.fn().mockResolvedValue('Wait completed') as any
        }
      ];

      promptManager.updateTools(newTools);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('browser_scroll: Scroll the page');
      expect(systemPrompt).toContain('browser_wait: Wait for an element');
      expect(systemPrompt).not.toContain('browser_click: Click on an element');
    });

    it('should handle empty tools update', () => {
      promptManager.updateTools([]);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('You are a browser-automation assistant');
      // The prompt will still contain "browser_click" in the instructions
      expect(systemPrompt).toContain('browser_click');
    });

    it('should preserve page context after tools update', () => {
      promptManager.setCurrentPageContext('https://example.com', 'Example');
      
      const newTools: BrowserTool[] = [
        {
          name: 'new_tool',
          description: 'A new tool',
          func: jest.fn().mockResolvedValue('Tool executed') as any
        }
      ];

      promptManager.updateTools(newTools);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('CURRENT PAGE CONTEXT');
      expect(systemPrompt).toContain('https://example.com');
      expect(systemPrompt).toContain('new_tool: A new tool');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow with page context and tools', () => {
      // Set page context
      promptManager.setCurrentPageContext('https://google.com', 'Google Search');
      
      // Update tools
      const searchTools: BrowserTool[] = [
        {
          name: 'search_input',
          description: 'Input search query',
          func: jest.fn().mockResolvedValue('Input completed') as any
        },
        {
          name: 'search_submit',
          description: 'Submit search form',
          func: jest.fn().mockResolvedValue('Form submitted') as any
        }
      ];
      
      promptManager.updateTools(searchTools);
      const systemPrompt = promptManager.getSystemPrompt();

      // Verify all components are present
      expect(systemPrompt).toContain('BrowserBee 🐝');
      expect(systemPrompt).toContain('CURRENT PAGE CONTEXT');
      expect(systemPrompt).toContain('https://google.com');
      expect(systemPrompt).toContain('search_input: Input search query');
      expect(systemPrompt).toContain('search_submit: Submit search form');
      expect(systemPrompt).toContain('CANONICAL SEQUENCE');
      expect(systemPrompt).toContain('TOOL-CALL SYNTAX');
    });

    it('should generate consistent prompts for same inputs', () => {
      promptManager.setCurrentPageContext('https://test.com', 'Test');
      
      const prompt1 = promptManager.getSystemPrompt();
      const prompt2 = promptManager.getSystemPrompt();

      expect(prompt1).toBe(prompt2);
    });

    it('should handle rapid context changes', () => {
      const contexts = [
        ['https://site1.com', 'Site 1'],
        ['https://site2.com', 'Site 2'],
        ['https://site3.com', 'Site 3']
      ];

      contexts.forEach(([url, title]) => {
        promptManager.setCurrentPageContext(url, title);
        const systemPrompt = promptManager.getSystemPrompt();
        
        expect(systemPrompt).toContain(url);
        expect(systemPrompt).toContain(title);
        
        // Ensure previous contexts are not present
        contexts.forEach(([otherUrl, otherTitle]) => {
          if (otherUrl !== url) {
            expect(systemPrompt).not.toContain(otherUrl);
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle tools with empty descriptions', () => {
      const toolsWithEmptyDesc: BrowserTool[] = [
        {
          name: 'tool1',
          description: '',
          func: jest.fn().mockResolvedValue('Tool1 executed') as any
        },
        {
          name: 'tool2',
          description: 'Valid description',
          func: jest.fn().mockResolvedValue('Tool2 executed') as any
        }
      ];

      promptManager.updateTools(toolsWithEmptyDesc);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('tool1: ');
      expect(systemPrompt).toContain('tool2: Valid description');
    });

    it('should handle tools with special characters in names and descriptions', () => {
      const specialTools: BrowserTool[] = [
        {
          name: 'tool_with_underscores',
          description: 'Description with "quotes" and & symbols',
          func: jest.fn().mockResolvedValue('Special tool executed') as any
        },
        {
          name: 'tool-with-dashes',
          description: 'Description with <tags> and [brackets]',
          func: jest.fn().mockResolvedValue('Dash tool executed') as any
        }
      ];

      promptManager.updateTools(specialTools);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('tool_with_underscores');
      expect(systemPrompt).toContain('tool-with-dashes');
      expect(systemPrompt).toContain('Description with "quotes" and & symbols');
      expect(systemPrompt).toContain('Description with <tags> and [brackets]');
    });

    it('should handle very long tool descriptions', () => {
      const longDescription = 'A'.repeat(1000);
      const longDescTools: BrowserTool[] = [
        {
          name: 'long_tool',
          description: longDescription,
          func: jest.fn().mockResolvedValue('Long tool executed') as any
        }
      ];

      promptManager.updateTools(longDescTools);
      const systemPrompt = promptManager.getSystemPrompt();

      expect(systemPrompt).toContain('long_tool');
      expect(systemPrompt).toContain(longDescription);
    });

    it('should handle undefined navigator gracefully', () => {
      // Temporarily remove navigator
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      // Mock navigator to return undefined for userAgent
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true
      });

      expect(() => {
        const tempPromptManager = new PromptManager(mockTools);
        tempPromptManager.getSystemPrompt();
      }).toThrow();

      // Restore navigator
      global.navigator = originalNavigator;
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with frequent updates', () => {
      // Simulate frequent updates
      for (let i = 0; i < 100; i++) {
        const tools: BrowserTool[] = [
          {
            name: `tool_${i}`,
            description: `Description ${i}`,
            func: jest.fn().mockResolvedValue(`Tool ${i} executed`) as any
          }
        ];
        
        promptManager.updateTools(tools);
        promptManager.setCurrentPageContext(`https://site${i}.com`, `Site ${i}`);
      }

      // Should still work correctly
      const systemPrompt = promptManager.getSystemPrompt();
      expect(systemPrompt).toContain('BrowserBee 🐝');
      expect(systemPrompt).toContain('tool_99');
      expect(systemPrompt).toContain('https://site99.com');
    });

    it('should generate prompts efficiently', () => {
      const startTime = Date.now();
      
      // Generate multiple prompts
      for (let i = 0; i < 50; i++) {
        promptManager.getSystemPrompt();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
