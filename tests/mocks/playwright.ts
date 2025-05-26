// Mock types for Playwright to avoid complex interface inheritance issues
export interface MockPage {
  goto: jest.MockedFunction<any>;
  click: jest.MockedFunction<any>;
  type: jest.MockedFunction<any>;
  screenshot: jest.MockedFunction<any>;
  evaluate: jest.MockedFunction<any>;
  waitForNavigation: jest.MockedFunction<any>;
  title: jest.MockedFunction<any>;
  url: jest.MockedFunction<any>;
  content: jest.MockedFunction<any>;
  locator: jest.MockedFunction<any>;
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
  };
  goBack: jest.MockedFunction<any>;
  goForward: jest.MockedFunction<any>;
  reload: jest.MockedFunction<any>;
  waitForSelector: jest.MockedFunction<any>;
  waitForTimeout: jest.MockedFunction<any>;
  setContent: jest.MockedFunction<any>;
  close: jest.MockedFunction<any>;
}

export function createMockPage(): MockPage {
  const mockPage: MockPage = {
    goto: jest.fn().mockResolvedValue(null),
    click: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
    evaluate: jest.fn().mockResolvedValue({}),
    waitForNavigation: jest.fn().mockResolvedValue(null),
    title: jest.fn().mockResolvedValue('Mock Page Title'),
    url: jest.fn().mockReturnValue('https://example.com'),
    content: jest.fn().mockResolvedValue('<html><body>Mock content</body></html>'),
    locator: jest.fn().mockReturnValue({
      click: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      textContent: jest.fn().mockResolvedValue('Mock text'),
      isVisible: jest.fn().mockResolvedValue(true),
      waitFor: jest.fn().mockResolvedValue(undefined),
    }),
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
    },
    goBack: jest.fn().mockResolvedValue(null),
    goForward: jest.fn().mockResolvedValue(null),
    reload: jest.fn().mockResolvedValue(null),
    waitForSelector: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(undefined),
    setContent: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return mockPage;
}

export interface MockBrowserContext {
  newPage: jest.MockedFunction<any>;
  close: jest.MockedFunction<any>;
  pages: jest.MockedFunction<any>;
}

export function createMockBrowserContext(): MockBrowserContext {
  return {
    newPage: jest.fn().mockResolvedValue(createMockPage()),
    close: jest.fn().mockResolvedValue(undefined),
    pages: jest.fn().mockReturnValue([createMockPage()]),
  };
}

export interface MockDialog {
  accept: jest.MockedFunction<any>;
  dismiss: jest.MockedFunction<any>;
  message: jest.MockedFunction<any>;
  type: jest.MockedFunction<any>;
}

export function createMockDialog(): MockDialog {
  return {
    accept: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(undefined),
    message: jest.fn().mockReturnValue('Mock dialog message'),
    type: jest.fn().mockReturnValue('alert'),
  };
}

// Mock the playwright-crx module
export const mockPlaywrightCrx = {
  start: jest.fn().mockResolvedValue({
    context: createMockBrowserContext(),
    page: createMockPage(),
  }),
};
