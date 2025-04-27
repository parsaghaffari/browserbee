/**
 * ScreenshotManager - Singleton class to manage screenshots
 * 
 * This class stores screenshots in memory and provides handles to reference them,
 * which significantly reduces token usage when sending screenshots to the LLM.
 */
export class ScreenshotManager {
  private static instance: ScreenshotManager;
  private screenshots: Map<string, any> = new Map();
  private counter: number = 0;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of ScreenshotManager
   * @returns The ScreenshotManager instance
   */
  static getInstance(): ScreenshotManager {
    if (!ScreenshotManager.instance) {
      ScreenshotManager.instance = new ScreenshotManager();
    }
    return ScreenshotManager.instance;
  }
  
  /**
   * Store a screenshot and return a handle to reference it
   * @param data The screenshot data to store
   * @returns A unique handle to reference the screenshot (e.g., "screenshot#42")
   */
  storeScreenshot(data: any): string {
    const id = `screenshot#${++this.counter}`;
    this.screenshots.set(id, data);
    return id;
  }
  
  /**
   * Get a screenshot by its handle
   * @param id The screenshot handle (e.g., "screenshot#42")
   * @returns The screenshot data, or null if not found
   */
  getScreenshot(id: string): any | null {
    return this.screenshots.get(id) || null;
  }
  
  /**
   * Check if a screenshot exists
   * @param id The screenshot handle to check
   * @returns True if the screenshot exists, false otherwise
   */
  hasScreenshot(id: string): boolean {
    return this.screenshots.has(id);
  }
  
  /**
   * Get all screenshot handles
   * @returns An array of all screenshot handles
   */
  getAllScreenshotIds(): string[] {
    return Array.from(this.screenshots.keys());
  }
  
  /**
   * Clear all screenshots from memory
   */
  clear(): void {
    this.screenshots.clear();
    this.counter = 0;
  }
}
