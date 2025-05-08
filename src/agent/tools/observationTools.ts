import { DynamicTool } from "langchain/tools";
import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";
import { truncate, MAX_RETURN_CHARS, MAX_SCREENSHOT_CHARS, withActivePage, getCurrentTabId } from "./utils";

export const browserGetTitle: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_get_title",
    description: "Return the current page title.",
    func: async () => {
      try {
        return await withActivePage(page, async (activePage) => {
          const title = await activePage.title();
          
          // Get the tab ID and send a tabTitleChanged message
          try {
            const tabId = await getCurrentTabId(activePage);
            
            // Send a message to update the UI with the tab title
            if (tabId) {
              chrome.runtime.sendMessage({
                action: 'tabTitleChanged',
                tabId: tabId,
                title: title
              });
              console.log(`Sent tabTitleChanged message for tab ${tabId} with title "${title}" from browser_get_title`);
            }
          } catch (titleError) {
            console.error("Error updating UI with tab title:", titleError);
          }
          
          return `Current page title: ${title}`;
        });
      } catch (error) {
        return `Error getting title: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    },
  });

export const browserSnapshotDom: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_snapshot_dom",
    description:
      "Capture DOM snapshot of the current page. Options (comma-separated):\n" +
      "  • selector=<css_selector> - capture only elements matching this selector\n" +
      "  • clean - remove scripts, styles, and other non-visible elements\n" +
      "  • structure - return only element tags, ids, and classes (no content)\n" +
      "  • limit=<number> - max character length (default 20000)",
    func: async (input: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          // Parse options from the input string
          const options = parseSnapshotOptions(input);
          const limit = options.limit ? parseInt(options.limit, 10) : MAX_RETURN_CHARS;
          
          let html = '';
          
          // If a selector is provided, only capture matching elements
          if (options.selector) {
            // Check if the selector exists on the page
            const elementCount = await activePage.$$eval(options.selector, (els: Element[]) => els.length);
            if (elementCount === 0) {
              return `No elements found matching selector: ${options.selector}`;
            }
            
            html = await activePage.$$eval(
              options.selector, 
              (elements: Element[], opts: { structure: boolean; clean: boolean }) => {
                return elements.map(el => {
                  if (opts.structure) {
                    return getElementStructure(el);
                  } else if (opts.clean) {
                    return cleanElement(el.cloneNode(true) as Element);
                  } else {
                    return el.outerHTML;
                  }
                }).join('\n\n');
                
                // Helper function to get a clean structure representation
                function getElementStructure(element: Element): string {
                  const tagName = element.tagName.toLowerCase();
                  const id = element.id ? `#${element.id}` : '';
                  const classes = element.className && typeof element.className === 'string' 
                    ? `.${element.className.split(' ').join('.')}` 
                    : '';
                  
                  let result = `<${tagName}${id}${classes}>`;
                  
                  if (element.children.length > 0) {
                    result += '\n  ' + Array.from(element.children)
                      .map(child => getElementStructure(child))
                      .join('\n  ')
                      .replace(/\n/g, '\n  ');
                  }
                  
                  result += `\n</${tagName}>`;
                  return result;
                }
                
                // Helper function to clean an element
                function cleanElement(node: Node): string {
                  if (node.nodeType === 3) { // Text node
                    return node.textContent || '';
                  }
                  
                  if (node.nodeType !== 1) { // Not an element node
                    return '';
                  }
                  
                  const element = node as Element;
                  
                  // Skip non-visible elements
                  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK'].includes(element.tagName)) {
                    return '';
                  }
                  
                  // Create a new clean element
                  const clean = document.createElement(element.tagName);
                  
                  // Copy attributes
                  Array.from(element.attributes).forEach((attr: Attr) => {
                    // Skip event handlers and data attributes
                    if (!attr.name.startsWith('on') && !attr.name.startsWith('data-')) {
                      clean.setAttribute(attr.name, attr.value);
                    }
                  });
                  
                  // Process children
                  Array.from(node.childNodes)
                    .map(child => cleanElement(child))
                    .filter(Boolean)
                    .forEach(childHtml => {
                      if (typeof childHtml === 'string') {
                        clean.innerHTML += childHtml;
                      }
                    });
                  
                  return clean.outerHTML;
                }
              },
              { 
                structure: options.structure || false,
                clean: options.clean || false
              }
            );
          } else {
            // Capture the entire page
            if (options.structure) {
              html = await activePage.evaluate(() => {
                function getPageStructure(element: Element, depth = 0): string {
                  const tagName = element.tagName.toLowerCase();
                  const id = element.id ? `#${element.id}` : '';
                  const classes = element.className && typeof element.className === 'string' 
                    ? `.${element.className.split(' ').join('.')}` 
                    : '';
                  
                  let result = '  '.repeat(depth) + `<${tagName}${id}${classes}>`;
                  
                  if (element.children.length > 0) {
                    result += '\n' + Array.from(element.children)
                      .map(child => getPageStructure(child, depth + 1))
                      .join('\n');
                  }
                  
                  result += '\n' + '  '.repeat(depth) + `</${tagName}>`;
                  return result;
                }
                
                return getPageStructure(document.documentElement);
              });
            } else if (options.clean) {
              html = await activePage.evaluate(() => {
                function cleanNode(node: Node): string {
                  if (node.nodeType === 3) { // Text node
                    return node.textContent || '';
                  }
                  
                  if (node.nodeType !== 1) { // Not an element node
                    return '';
                  }
                  
                  const element = node as Element;
                  
                  // Skip non-visible elements
                  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK'].includes(element.tagName)) {
                    return '';
                  }
                  
                  // Create a new clean element
                  const clean = document.createElement(element.tagName);
                  
                  // Copy attributes
                  Array.from(element.attributes).forEach((attr: Attr) => {
                    // Skip event handlers and data attributes
                    if (!attr.name.startsWith('on') && !attr.name.startsWith('data-')) {
                      clean.setAttribute(attr.name, attr.value);
                    }
                  });
                  
                  // Process children
                  Array.from(node.childNodes)
                    .map(child => cleanNode(child))
                    .filter(Boolean)
                    .forEach(childHtml => {
                      if (typeof childHtml === 'string') {
                        clean.innerHTML += childHtml;
                      }
                    });
                  
                  return clean.outerHTML;
                }
                
                return cleanNode(document.documentElement);
              });
            } else {
              // Get the raw HTML content
              html = await activePage.content();
            }
          }
          
          return truncate(html, isNaN(limit) ? MAX_RETURN_CHARS : limit);
        });
      } catch (err) {
        return `Error capturing DOM snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

// Helper function to parse options from the input string
function parseSnapshotOptions(input: string) {
  const options: { 
    selector?: string; 
    clean?: boolean; 
    structure?: boolean; 
    limit?: string;
  } = {};
  
  if (!input || input.trim() === '') {
    return options;
  }
  
  // Check if input is just a number (backward compatibility)
  if (/^\d+$/.test(input.trim())) {
    options.limit = input.trim();
    return options;
  }
  
  // Parse comma-separated options
  input.split(',').forEach(part => {
    const trimmed = part.trim();
    
    if (trimmed === 'clean') {
      options.clean = true;
    } else if (trimmed === 'structure') {
      options.structure = true;
    } else if (trimmed.startsWith('selector=')) {
      options.selector = trimmed.substring('selector='.length);
    } else if (trimmed.startsWith('limit=')) {
      options.limit = trimmed.substring('limit='.length);
    }
  });
  
  return options;
}

export const browserQuery: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_query",
    description:
      "Return up to 10 outerHTML snippets for a CSS selector you provide.",
    func: async (selector: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          const matches = (await activePage.$$eval(
            selector,
            (nodes: Element[]) => nodes.slice(0, 10).map((n) => n.outerHTML)
          )) as string[];
          if (!matches.length) return `No nodes matched ${selector}`;
          return truncate(matches.join("\n\n"));
        });
      } catch (err) {
        return `Error querying '${selector}': ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserAccessibleTree: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_accessible_tree",
    description:
      "Return the AX accessibility tree JSON (default: interesting‑only). Input 'all' to dump full tree.",
    func: async (input: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          const interestingOnly = input.trim().toLowerCase() !== "all";
          const tree = await activePage.accessibility.snapshot({ interestingOnly });
          return truncate(JSON.stringify(tree, null, 2));
        });
      } catch (err) {
        return `Error creating AX snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserReadText: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_read_text",
    description:
      "Return all visible text on the page, concatenated in DOM order.",
    func: async () => {
      try {
        return await withActivePage(page, async (activePage) => {
          const text = await activePage.evaluate(() => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) =>
                  node.parentElement &&
                  node.parentElement.offsetParent !== null &&
                  node.textContent!.trim()
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT,
              }
            );
            const out: string[] = [];
            while (walker.nextNode())
              out.push((walker.currentNode as Text).textContent!.trim());
            return out.join("\n");
          });
          return truncate(text as string);
        });
      } catch (err) {
        return `Error extracting text: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });

export const browserScreenshot: ToolFactory = (page: Page) =>
  new DynamicTool({
    name: "browser_screenshot",
    description:
      "Take a screenshot of the current page.\n\n" +
      "Input flags (comma-separated):\n" +
      "  • (none)  – capture viewport only, downscaled to 800px wide (default)\n" +
      "  • full    – capture the full scrolling page, downscaled to 1000px wide\n\n" +
      "Screenshots are automatically optimized for token limits." +
      "Use `browser_snapshot_dom` for structured info; resort to screenshots only\n" +
      "when you truly need pixels (e.g. images, charts, maps, or to show the user).",
    func: async (input: string) => {
      try {
        return await withActivePage(page, async (activePage) => {
          // Constants
          const MAX_CHARS = MAX_SCREENSHOT_CHARS;
          const DEFAULT_WIDTH = 800;
          const FULL_PAGE_WIDTH = 1000;
          
          // Parse flags
          const flags = input
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

          // Set options based on flags
          const fullPage = flags.includes("full");
          const targetWidth = fullPage ? FULL_PAGE_WIDTH : DEFAULT_WIDTH;
          let quality = 40;
          
          // Take initial screenshot
          let buffer;
          try {
            buffer = await activePage.screenshot({ 
              type: "jpeg", 
              fullPage, 
              quality 
            });
          } catch (screenshotError) {
            return `Error taking initial screenshot: ${
              screenshotError instanceof Error ? screenshotError.message : String(screenshotError)
            }`;
          }
          
          let base64 = buffer.toString("base64");
          
          // Get page dimensions
          interface PageDimensions {
            width: number;
            height: number;
          }
          
          let dimensions;
          try {
            dimensions = await activePage.evaluate(() => {
              return {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight
              };
            }) as PageDimensions;
          } catch (dimensionsError) {
            return `Error getting page dimensions: ${
              dimensionsError instanceof Error ? dimensionsError.message : String(dimensionsError)
            }`;
          }
          
          // If the image is too large, we need to downscale it
          if (base64.length > MAX_CHARS) {
            // Define types for the downscale result
            interface DownscaleResult {
              base64: string;
              width: number;
              height: number;
              error?: string;
            }
            
            // Function to downscale the image in the browser
            let downscaledResult;
            try {
              downscaledResult = await activePage.evaluate(
                (params: { b64: string; targetW: number; q: number }) => {
                  const { b64, targetW, q } = params;
                  
                  return new Promise((resolve) => {
                    // Create an image from the base64 data
                    const img = new Image();
                    img.onload = () => {
                      // Calculate scale factor
                      const scale = targetW / img.width;
                      
                      // If image is already smaller than target, no need to resize
                      if (scale >= 1) {
                        resolve({ 
                          base64: b64, 
                          width: img.width, 
                          height: img.height 
                        });
                        return;
                      }
                      
                      // Calculate new dimensions
                      const newWidth = targetW;
                      const newHeight = Math.round(img.height * scale);
                      
                      try {
                        // Create canvas for resizing
                        const canvas = document.createElement("canvas");
                        canvas.width = newWidth;
                        canvas.height = newHeight;
                        
                        // Draw resized image on canvas
                        const ctx = canvas.getContext("2d");
                        if (!ctx) {
                          resolve({ 
                            base64: b64, 
                            width: 0, 
                            height: 0,
                            error: "Failed to get canvas context" 
                          });
                          return;
                        }
                        
                        ctx.drawImage(img, 0, 0, newWidth, newHeight);
                        
                        // Get base64 data from canvas
                        const resizedBase64 = canvas.toDataURL("image/jpeg", q / 100)
                          .replace("data:image/jpeg;base64,", "");
                        
                        resolve({
                          base64: resizedBase64,
                          width: newWidth,
                          height: newHeight
                        });
                      } catch (canvasError) {
                        resolve({ 
                          base64: b64, 
                          width: 0, 
                          height: 0,
                          error: "Canvas error: " + canvasError 
                        });
                      }
                    };
                    
                    img.onerror = () => {
                      resolve({ 
                        base64: b64, 
                        width: 0, 
                        height: 0,
                        error: "Failed to load image" 
                      });
                    };
                    
                    img.src = "data:image/jpeg;base64," + b64;
                  });
                },
                { b64: base64, targetW: targetWidth, q: quality }
              );
            } catch (downscaleError) {
              return `Error running downscale script: ${
                downscaleError instanceof Error ? downscaleError.message : String(downscaleError)
              }`;
            }
            
            // Type assertion for the result
            const result = downscaledResult as DownscaleResult;
            
            // Check for errors
            if (result.error) {
              return `Error downscaling image: ${result.error}`;
            }
            
            // Update base64 and dimensions
            base64 = result.base64;
            dimensions.width = result.width;
            dimensions.height = result.height;
            
            // If still too big, reduce quality until it fits
            while (base64.length > MAX_CHARS && quality > 10) {
              quality -= 5;
              
              interface RecompressResult {
                base64: string;
                error?: string;
              }
              
              // Recompress the image
              let recompressedResult;
              try {
                recompressedResult = await activePage.evaluate(
                  (params: { b64: string; w: number; h: number; q: number }) => {
                    const { b64, w, h, q } = params;
                    
                    return new Promise((resolve) => {
                      const img = new Image();
                      img.onload = () => {
                        try {
                          const canvas = document.createElement("canvas");
                          canvas.width = w;
                          canvas.height = h;
                          
                          const ctx = canvas.getContext("2d");
                          if (!ctx) {
                            resolve({ 
                              base64: b64,
                              error: "Failed to get canvas context for recompression" 
                            });
                            return;
                          }
                          
                          ctx.drawImage(img, 0, 0, w, h);
                          
                          const recompressedBase64 = canvas.toDataURL("image/jpeg", q / 100)
                            .replace("data:image/jpeg;base64,", "");
                          
                          resolve({ base64: recompressedBase64 });
                        } catch (canvasError) {
                          resolve({ 
                            base64: b64,
                            error: "Canvas error during recompression: " + canvasError 
                          });
                        }
                      };
                      
                      img.onerror = () => {
                        resolve({ 
                          base64: b64,
                          error: "Failed to load image for recompression" 
                        });
                      };
                      
                      img.src = "data:image/jpeg;base64," + b64;
                    });
                  },
                  { b64: base64, w: dimensions.width, h: dimensions.height, q: quality }
                );
              } catch (recompressError) {
                return `Error running recompress script: ${
                  recompressError instanceof Error ? recompressError.message : String(recompressError)
                }`;
              }
              
              const recompressResult = recompressedResult as RecompressResult;
              
              if (recompressResult.error) {
                return `Error recompressing image: ${recompressResult.error}`;
              }
              
              base64 = recompressResult.base64;
            }
          }
          
          // If still too big after all optimizations, return error
          if (base64.length > MAX_CHARS) {
            return `Error: screenshot exceeds ${MAX_CHARS} characters even at minimum quality.`;
          }
          
          return JSON.stringify({
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64
            }
          });
        });
      } catch (err) {
        return `Error taking screenshot: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    },
  });
