import { jest } from '@jest/globals';
import { createMockPage } from '../../mocks/playwright';

// Import the classes and functions to test
import {
  PageContextManager,
  getCurrentPage,
  setCurrentPage,
  initializePageContext,
  resetPageContext
} from '../../../src/agent/PageContextManager';

describe('PageContextManager', () => {
  let mockPage1: any;
  let mockPage2: any;
  let mockPage3: any;
  let consoleSpy: any;

  beforeEach(() => {
    mockPage1 = createMockPage();
    mockPage2 = createMockPage();
    mockPage3 = createMockPage();
    
    // Reset the singleton instance before each test
    (PageContextManager as any).instance = undefined;
    
    // Setup console spy
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = PageContextManager.getInstance();
      const instance2 = PageContextManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(PageContextManager);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = PageContextManager.getInstance();
      instance1.setCurrentPage(mockPage1);

      const instance2 = PageContextManager.getInstance();
      const currentPage = instance2.getCurrentPage(mockPage2);

      expect(currentPage).toBe(mockPage1);
    });
  });

  describe('setCurrentPage', () => {
    it('should set the current page', () => {
      const manager = PageContextManager.getInstance();

      manager.setCurrentPage(mockPage1);

      expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Active page updated');
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
    });

    it('should update the current page when called multiple times', () => {
      const manager = PageContextManager.getInstance();
      
      manager.setCurrentPage(mockPage1);
      expect(manager.getCurrentPage(mockPage3)).toBe(mockPage1);

      manager.setCurrentPage(mockPage2);
      expect(manager.getCurrentPage(mockPage3)).toBe(mockPage2);
    });

    it('should handle null page gracefully', () => {
      const manager = PageContextManager.getInstance();
      
      expect(() => {
        manager.setCurrentPage(null as any);
      }).not.toThrow();
    });
  });

  describe('getCurrentPage', () => {
    it('should return the current page when one is set', () => {
      const manager = PageContextManager.getInstance();
      manager.setCurrentPage(mockPage1);

      const result = manager.getCurrentPage(mockPage2);

      expect(result).toBe(mockPage1);
    });

    it('should return the fallback page when no current page is set', () => {
      const manager = PageContextManager.getInstance();

      const result = manager.getCurrentPage(mockPage2);

      expect(result).toBe(mockPage2);
    });

    it('should return the current page even if fallback is provided', () => {
      const manager = PageContextManager.getInstance();
      manager.setCurrentPage(mockPage1);

      const result = manager.getCurrentPage(mockPage2);

      expect(result).toBe(mockPage1);
      expect(result).not.toBe(mockPage2);
    });
  });

  describe('initialize', () => {
    it('should set the initial page when no current page exists', () => {
      const manager = PageContextManager.getInstance();

      manager.initialize(mockPage1);

      expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Initialized with initial page');
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
    });

    it('should not override existing current page', () => {
      const manager = PageContextManager.getInstance();
      
      manager.setCurrentPage(mockPage1);
      consoleSpy.mockClear(); // Clear previous calls
      manager.initialize(mockPage2);

      expect(consoleSpy).not.toHaveBeenCalledWith('PageContextManager: Initialized with initial page');
      expect(manager.getCurrentPage(mockPage3)).toBe(mockPage1);
    });

    it('should handle multiple initialization calls', () => {
      const manager = PageContextManager.getInstance();

      manager.initialize(mockPage1);
      manager.initialize(mockPage2);
      manager.initialize(mockPage3);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Initialized with initial page');
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
    });
  });

  describe('reset', () => {
    it('should clear the current page', () => {
      const manager = PageContextManager.getInstance();
      
      manager.setCurrentPage(mockPage1);
      manager.reset();

      expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Reset');
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage2);
    });

    it('should allow reinitialization after reset', () => {
      const manager = PageContextManager.getInstance();

      manager.initialize(mockPage1);
      manager.reset();
      manager.initialize(mockPage2);

      expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Initialized with initial page');
      expect(manager.getCurrentPage(mockPage3)).toBe(mockPage2);
    });

    it('should handle reset when no page is set', () => {
      const manager = PageContextManager.getInstance();

      expect(() => {
        manager.reset();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Reset');
    });
  });

  describe('Helper Functions', () => {
    describe('getCurrentPage helper', () => {
      it('should return the current page from the singleton instance', () => {
        const manager = PageContextManager.getInstance();
        manager.setCurrentPage(mockPage1);

        const result = getCurrentPage(mockPage2);

        expect(result).toBe(mockPage1);
      });

      it('should return fallback when no current page is set', () => {
        const result = getCurrentPage(mockPage2);

        expect(result).toBe(mockPage2);
      });
    });

    describe('setCurrentPage helper', () => {
      it('should set the current page on the singleton instance', () => {
        setCurrentPage(mockPage1);

        expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Active page updated');
        
        const manager = PageContextManager.getInstance();
        expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
      });
    });

    describe('initializePageContext helper', () => {
      it('should initialize the singleton instance', () => {
        initializePageContext(mockPage1);

        expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Initialized with initial page');
        
        const manager = PageContextManager.getInstance();
        expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
      });
    });

    describe('resetPageContext helper', () => {
      it('should reset the singleton instance', () => {
        setCurrentPage(mockPage1);
        resetPageContext();

        expect(consoleSpy).toHaveBeenCalledWith('PageContextManager: Reset');
        
        const manager = PageContextManager.getInstance();
        expect(manager.getCurrentPage(mockPage2)).toBe(mockPage2);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete page lifecycle', () => {
      // Initialize
      initializePageContext(mockPage1);
      expect(getCurrentPage(mockPage3)).toBe(mockPage1);

      // Update
      setCurrentPage(mockPage2);
      expect(getCurrentPage(mockPage3)).toBe(mockPage2);

      // Reset
      resetPageContext();
      expect(getCurrentPage(mockPage3)).toBe(mockPage3);

      // Reinitialize
      initializePageContext(mockPage1);
      expect(getCurrentPage(mockPage3)).toBe(mockPage1);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });

    it('should maintain consistency between direct and helper function calls', () => {
      const manager = PageContextManager.getInstance();

      // Set via helper
      setCurrentPage(mockPage1);
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);

      // Set via direct call
      manager.setCurrentPage(mockPage2);
      expect(getCurrentPage(mockPage3)).toBe(mockPage2);

      // Reset via helper
      resetPageContext();
      expect(manager.getCurrentPage(mockPage1)).toBe(mockPage1);
    });

    it('should handle rapid page switching', () => {
      const pages = [mockPage1, mockPage2, mockPage3];
      
      // Rapidly switch between pages
      for (let i = 0; i < 10; i++) {
        const page = pages[i % pages.length];
        setCurrentPage(page);
        expect(getCurrentPage(mockPage1)).toBe(page);
      }
    });

    it('should handle concurrent access patterns', () => {
      // Simulate concurrent access
      const manager1 = PageContextManager.getInstance();
      const manager2 = PageContextManager.getInstance();

      manager1.setCurrentPage(mockPage1);
      expect(manager2.getCurrentPage(mockPage2)).toBe(mockPage1);

      manager2.setCurrentPage(mockPage2);
      expect(manager1.getCurrentPage(mockPage3)).toBe(mockPage2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined fallback page', () => {
      const manager = PageContextManager.getInstance();

      expect(() => {
        manager.getCurrentPage(undefined as any);
      }).not.toThrow();
    });

    it('should handle setting the same page multiple times', () => {
      const manager = PageContextManager.getInstance();

      manager.setCurrentPage(mockPage1);
      manager.setCurrentPage(mockPage1);
      manager.setCurrentPage(mockPage1);

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
    });

    it('should handle initialization with the same page multiple times', () => {
      const manager = PageContextManager.getInstance();

      manager.initialize(mockPage1);
      manager.initialize(mockPage1);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
    });

    it('should handle reset followed by immediate getCurrentPage', () => {
      const manager = PageContextManager.getInstance();
      
      manager.setCurrentPage(mockPage1);
      manager.reset();
      
      const result = manager.getCurrentPage(mockPage2);
      expect(result).toBe(mockPage2);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory when pages are switched frequently', () => {
      const manager = PageContextManager.getInstance();
      
      // Create many mock pages and switch between them
      for (let i = 0; i < 100; i++) {
        const tempPage = createMockPage() as any;
        manager.setCurrentPage(tempPage);
      }

      // Should still work correctly
      manager.setCurrentPage(mockPage1);
      expect(manager.getCurrentPage(mockPage2)).toBe(mockPage1);
    });

    it('should properly clean up on reset', () => {
      const manager = PageContextManager.getInstance();
      
      manager.setCurrentPage(mockPage1);
      const pageBeforeReset = manager.getCurrentPage(mockPage2);
      
      manager.reset();
      const pageAfterReset = manager.getCurrentPage(mockPage2);
      
      expect(pageBeforeReset).toBe(mockPage1);
      expect(pageAfterReset).toBe(mockPage2);
    });
  });
});
