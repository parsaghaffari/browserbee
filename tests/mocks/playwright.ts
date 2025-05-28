// Mock types for Playwright to avoid complex interface inheritance issues
export interface MockPage {
  goto: jest.MockedFunction<any>;
  click: jest.MockedFunction<any>;
  type: jest.MockedFunction<any>;
  fill: jest.MockedFunction<any>;
  screenshot: jest.MockedFunction<any>;
  evaluate: jest.MockedFunction<any>;
  waitForNavigation: jest.MockedFunction<any>;
  title: jest.MockedFunction<any>;
  url: jest.MockedFunction<any>;
  content: jest.MockedFunction<any>;
  locator: jest.MockedFunction<any>;
  getByText: jest.MockedFunction<any>;
  $$eval: jest.MockedFunction<any>;
  $eval: jest.MockedFunction<any>;
  $$: jest.MockedFunction<any>;
  $: jest.MockedFunction<any>;
  accessibility: {
    snapshot: jest.MockedFunction<any>;
  };
  keyboard: {
    press: jest.MockedFunction<any>;
    type: jest.MockedFunction<any>;
    down: jest.MockedFunction<any>;
    up: jest.MockedFunction<any>;
    insertText: jest.MockedFunction<any>;
  };
  mouse: {
    click: jest.MockedFunction<any>;
    move: jest.MockedFunction<any>;
    wheel: jest.MockedFunction<any>;
    down: jest.MockedFunction<any>;
    up: jest.MockedFunction<any>;
  };
  goBack: jest.MockedFunction<any>;
  goForward: jest.MockedFunction<any>;
  reload: jest.MockedFunction<any>;
  waitForSelector: jest.MockedFunction<any>;
  waitForTimeout: jest.MockedFunction<any>;
  setContent: jest.MockedFunction<any>;
  close: jest.MockedFunction<any>;
  on: jest.MockedFunction<any>;
  off: jest.MockedFunction<any>;
  context: jest.MockedFunction<any>;
  setViewportSize: jest.MockedFunction<any>;
  viewportSize: jest.MockedFunction<any>;
  scroll: jest.MockedFunction<any>;
  hover: jest.MockedFunction<any>;
  focus: jest.MockedFunction<any>;
  blur: jest.MockedFunction<any>;
  selectOption: jest.MockedFunction<any>;
  check: jest.MockedFunction<any>;
  uncheck: jest.MockedFunction<any>;
  dragAndDrop: jest.MockedFunction<any>;
  setInputFiles: jest.MockedFunction<any>;
  addScriptTag: jest.MockedFunction<any>;
  addStyleTag: jest.MockedFunction<any>;
  exposeFunction: jest.MockedFunction<any>;
  route: jest.MockedFunction<any>;
  unroute: jest.MockedFunction<any>;
  waitForEvent: jest.MockedFunction<any>;
  waitForFunction: jest.MockedFunction<any>;
  waitForLoadState: jest.MockedFunction<any>;
  waitForResponse: jest.MockedFunction<any>;
  waitForRequest: jest.MockedFunction<any>;
  emulateMedia: jest.MockedFunction<any>;
  setExtraHTTPHeaders: jest.MockedFunction<any>;
  setGeolocation: jest.MockedFunction<any>;
  bringToFront: jest.MockedFunction<any>;
}

export interface MockBrowserContext {
  newPage: jest.MockedFunction<any>;
  close: jest.MockedFunction<any>;
  pages: jest.MockedFunction<any>;
  cookies: jest.MockedFunction<any>;
  setCookies: jest.MockedFunction<any>;
  clearCookies: jest.MockedFunction<any>;
  grantPermissions: jest.MockedFunction<any>;
  clearPermissions: jest.MockedFunction<any>;
  setGeolocation: jest.MockedFunction<any>;
  setExtraHTTPHeaders: jest.MockedFunction<any>;
  setOffline: jest.MockedFunction<any>;
  addInitScript: jest.MockedFunction<any>;
  exposeFunction: jest.MockedFunction<any>;
  route: jest.MockedFunction<any>;
  unroute: jest.MockedFunction<any>;
  waitForEvent: jest.MockedFunction<any>;
  storageState: jest.MockedFunction<any>;
}

// Create a simple mock context without circular dependencies
function createSimpleMockContext(): MockBrowserContext {
  return {
    newPage: jest.fn().mockImplementation(() => createMockPage()),
    close: jest.fn().mockResolvedValue(undefined),
    pages: jest.fn().mockImplementation(() => [createMockPage()]),
    cookies: jest.fn().mockResolvedValue([]),
    setCookies: jest.fn().mockResolvedValue(undefined),
    clearCookies: jest.fn().mockResolvedValue(undefined),
    grantPermissions: jest.fn().mockResolvedValue(undefined),
    clearPermissions: jest.fn().mockResolvedValue(undefined),
    setGeolocation: jest.fn().mockResolvedValue(undefined),
    setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
    setOffline: jest.fn().mockResolvedValue(undefined),
    addInitScript: jest.fn().mockResolvedValue(undefined),
    exposeFunction: jest.fn().mockResolvedValue(undefined),
    route: jest.fn().mockResolvedValue(undefined),
    unroute: jest.fn().mockResolvedValue(undefined),
    waitForEvent: jest.fn().mockResolvedValue({}),
    storageState: jest.fn().mockResolvedValue({}),
  };
}

export function createMockPage(): MockPage {
  const mockPage: MockPage = {
    goto: jest.fn().mockResolvedValue(null),
    click: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    fill: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
    evaluate: jest.fn().mockImplementation((fn, ...args) => {
      // Handle common evaluate scenarios
      if (typeof fn === 'function') {
        const fnString = fn.toString();
        
        // Mock page dimensions
        if (fnString.includes('clientWidth') || fnString.includes('clientHeight')) {
          return Promise.resolve({ width: 1024, height: 768 });
        }
        
        // Mock text extraction
        if (fnString.includes('textContent') || fnString.includes('innerText')) {
          return Promise.resolve('Mock page text content');
        }
        
        // Mock DOM structure
        if (fnString.includes('documentElement') || fnString.includes('outerHTML')) {
          return Promise.resolve('<html><body>Mock HTML structure</body></html>');
        }
        
        // Mock canvas operations for screenshot downscaling
        if (fnString.includes('canvas') || fnString.includes('toDataURL')) {
          return Promise.resolve({
            base64: 'mock-base64-data',
            width: 800,
            height: 600
          });
        }
      }
      
      return Promise.resolve({});
    }),
    waitForNavigation: jest.fn().mockResolvedValue(null),
    title: jest.fn().mockResolvedValue('Mock Page Title'),
    url: jest.fn().mockReturnValue('https://example.com'),
    content: jest.fn().mockResolvedValue('<html><body>Mock content</body></html>'),
    locator: jest.fn().mockReturnValue({
      click: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      textContent: jest.fn().mockResolvedValue('Mock text'),
      isVisible: jest.fn().mockResolvedValue(true),
      waitFor: jest.fn().mockResolvedValue(undefined),
      hover: jest.fn().mockResolvedValue(undefined),
      focus: jest.fn().mockResolvedValue(undefined),
      blur: jest.fn().mockResolvedValue(undefined),
    }),
    getByText: jest.fn().mockReturnValue({
      click: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      textContent: jest.fn().mockResolvedValue('Mock text'),
      isVisible: jest.fn().mockResolvedValue(true),
      waitFor: jest.fn().mockResolvedValue(undefined),
    }),
    $$eval: jest.fn().mockImplementation((selector, fn) => {
      // Mock element queries
      if (selector && typeof fn === 'function') {
        const fnString = fn.toString();
        
        // Mock element count
        if (fnString.includes('length')) {
          return Promise.resolve(3);
        }
        
        // Mock element HTML
        if (fnString.includes('outerHTML')) {
          return Promise.resolve([
            '<div class="mock-element">Mock Element 1</div>',
            '<div class="mock-element">Mock Element 2</div>',
            '<div class="mock-element">Mock Element 3</div>'
          ]);
        }
      }
      
      return Promise.resolve([]);
    }),
    $eval: jest.fn().mockResolvedValue('Mock single element result'),
    $$: jest.fn().mockResolvedValue([]),
    $: jest.fn().mockResolvedValue(null),
    accessibility: {
      snapshot: jest.fn().mockResolvedValue({
        role: 'WebArea',
        name: 'Mock Page',
        children: [
          { role: 'heading', name: 'Mock Heading', level: 1 },
          { role: 'button', name: 'Mock Button' },
          { role: 'textbox', name: 'Mock Input' }
        ]
      }),
    },
    keyboard: {
      press: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      up: jest.fn().mockResolvedValue(undefined),
      insertText: jest.fn().mockResolvedValue(undefined),
    },
    mouse: {
      click: jest.fn().mockResolvedValue(undefined),
      move: jest.fn().mockResolvedValue(undefined),
      wheel: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      up: jest.fn().mockResolvedValue(undefined),
    },
    goBack: jest.fn().mockResolvedValue(null),
    goForward: jest.fn().mockResolvedValue(null),
    reload: jest.fn().mockResolvedValue(null),
    waitForSelector: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(undefined),
    setContent: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnValue(undefined),
    off: jest.fn().mockReturnValue(undefined),
    context: jest.fn().mockImplementation(() => createSimpleMockContext()),
    setViewportSize: jest.fn().mockResolvedValue(undefined),
    viewportSize: jest.fn().mockReturnValue({ width: 1024, height: 768 }),
    scroll: jest.fn().mockResolvedValue(undefined),
    hover: jest.fn().mockResolvedValue(undefined),
    focus: jest.fn().mockResolvedValue(undefined),
    blur: jest.fn().mockResolvedValue(undefined),
    selectOption: jest.fn().mockResolvedValue([]),
    check: jest.fn().mockResolvedValue(undefined),
    uncheck: jest.fn().mockResolvedValue(undefined),
    dragAndDrop: jest.fn().mockResolvedValue(undefined),
    setInputFiles: jest.fn().mockResolvedValue(undefined),
    addScriptTag: jest.fn().mockResolvedValue({}),
    addStyleTag: jest.fn().mockResolvedValue({}),
    exposeFunction: jest.fn().mockResolvedValue(undefined),
    route: jest.fn().mockResolvedValue(undefined),
    unroute: jest.fn().mockResolvedValue(undefined),
    waitForEvent: jest.fn().mockResolvedValue({}),
    waitForFunction: jest.fn().mockResolvedValue({}),
    waitForLoadState: jest.fn().mockResolvedValue(undefined),
    waitForResponse: jest.fn().mockResolvedValue({}),
    waitForRequest: jest.fn().mockResolvedValue({}),
    emulateMedia: jest.fn().mockResolvedValue(undefined),
    setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
    setGeolocation: jest.fn().mockResolvedValue(undefined),
    bringToFront: jest.fn().mockResolvedValue(undefined),
  };

  return mockPage;
}

export function createMockBrowserContext(): MockBrowserContext {
  return createSimpleMockContext();
}

export interface MockDialog {
  accept: jest.MockedFunction<any>;
  dismiss: jest.MockedFunction<any>;
  message: jest.MockedFunction<any>;
  type: jest.MockedFunction<any>;
  defaultValue: jest.MockedFunction<any>;
}

export function createMockDialog(type: 'alert' | 'confirm' | 'prompt' = 'alert'): MockDialog {
  return {
    accept: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(undefined),
    message: jest.fn().mockReturnValue('Mock dialog message'),
    type: jest.fn().mockReturnValue(type),
    defaultValue: jest.fn().mockReturnValue(''),
  };
}

// Mock the playwright-crx module
export const mockPlaywrightCrx = {
  start: jest.fn().mockResolvedValue({
    context: createMockBrowserContext(),
    page: createMockPage(),
  }),
};

// Enhanced mock for Chrome APIs used by tools
export const mockChromeAPIs = {
  tabs: {
    query: jest.fn().mockResolvedValue([
      { id: 1, url: 'https://example.com', title: 'Mock Tab' }
    ]),
    get: jest.fn().mockResolvedValue({ id: 1, url: 'https://example.com', title: 'Mock Tab' }),
    update: jest.fn().mockResolvedValue({ id: 1, url: 'https://example.com', title: 'Mock Tab' }),
    create: jest.fn().mockResolvedValue({ id: 2, url: 'https://new-tab.com', title: 'New Tab' }),
    remove: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    goBack: jest.fn().mockResolvedValue(undefined),
    goForward: jest.fn().mockResolvedValue(undefined),
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    },
  },
};

// Mock for ScreenshotManager
export const mockScreenshotManager = {
  getInstance: jest.fn().mockReturnValue({
    storeScreenshot: jest.fn().mockReturnValue('mock-screenshot-id'),
    getScreenshot: jest.fn().mockReturnValue({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: 'mock-base64-data'
      }
    }),
    clearScreenshots: jest.fn().mockReturnValue(undefined),
  }),
};

// Mock for PageContextManager
export const mockPageContextManager = {
  getCurrentPage: jest.fn().mockImplementation((page) => page),
  initialize: jest.fn().mockReturnValue(undefined),
  updateCurrentPage: jest.fn().mockReturnValue(undefined),
};
