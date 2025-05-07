import type { Page } from "playwright-crx";

/**
 * PageContextManager is responsible for tracking the currently active page.
 * This ensures that all tools operate on the correct page, even after tab switching.
 */
export class PageContextManager {
  private static instance: PageContextManager;
  private currentPage: Page | null = null;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of PageContextManager
   */
  public static getInstance(): PageContextManager {
    if (!PageContextManager.instance) {
      PageContextManager.instance = new PageContextManager();
    }
    return PageContextManager.instance;
  }

  /**
   * Set the current active page
   * @param page The page to set as active
   */
  public setCurrentPage(page: Page): void {
    this.currentPage = page;
    console.log("PageContextManager: Active page updated");
  }

  /**
   * Get the current active page
   * @param fallbackPage Fallback page to use if no current page is set
   * @returns The current active page or the fallback page
   */
  public getCurrentPage(fallbackPage: Page): Page {
    return this.currentPage || fallbackPage;
  }

  /**
   * Initialize the PageContextManager with an initial page
   * @param initialPage The initial page to set
   */
  public initialize(initialPage: Page): void {
    if (!this.currentPage) {
      this.currentPage = initialPage;
      console.log("PageContextManager: Initialized with initial page");
    }
  }

  /**
   * Reset the PageContextManager
   */
  public reset(): void {
    this.currentPage = null;
    console.log("PageContextManager: Reset");
  }
}

/**
 * Helper function to get the current active page
 * @param fallbackPage Fallback page to use if no current page is set
 * @returns The current active page or the fallback page
 */
export function getCurrentPage(fallbackPage: Page): Page {
  return PageContextManager.getInstance().getCurrentPage(fallbackPage);
}

/**
 * Helper function to set the current active page
 * @param page The page to set as active
 */
export function setCurrentPage(page: Page): void {
  PageContextManager.getInstance().setCurrentPage(page);
}

/**
 * Helper function to initialize the PageContextManager
 * @param initialPage The initial page to set
 */
export function initializePageContext(initialPage: Page): void {
  PageContextManager.getInstance().initialize(initialPage);
}

/**
 * Helper function to reset the PageContextManager
 */
export function resetPageContext(): void {
  PageContextManager.getInstance().reset();
}
