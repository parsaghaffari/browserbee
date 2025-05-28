import '@testing-library/jest-dom';
import '@anthropic-ai/sdk/shims/node';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Add Node.js polyfills for browser APIs that LangChain needs
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.ReadableStream = ReadableStream as any;

// Mock Chrome APIs globally
const mockChrome = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    onSuspend: {
      addListener: jest.fn(),
    },
    onUpdateAvailable: {
      addListener: jest.fn(),
    },
    openOptionsPage: jest.fn(),
    id: 'test-extension-id',
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 1, url: 'about:blank' }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    get: jest.fn().mockResolvedValue({ id: 1, windowId: 1, url: 'about:blank' }),
    onCreated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
    onUpdated: {
      addListener: jest.fn(),
    },
  },
  action: {
    onClicked: {
      addListener: jest.fn(),
    },
  },
  sidePanel: {
    open: jest.fn().mockResolvedValue(undefined),
  },
  commands: {
    getAll: jest.fn().mockResolvedValue([]),
    onCommand: {
      addListener: jest.fn(),
    },
  },
  debugger: {
    attach: jest.fn().mockResolvedValue(undefined),
    detach: jest.fn().mockResolvedValue(undefined),
    sendCommand: jest.fn().mockResolvedValue({}),
    onEvent: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// Set up global chrome object
Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true,
});

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          get: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          put: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          delete: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          getAll: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        }),
      }),
      close: jest.fn(),
    },
  }),
  deleteDatabase: jest.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
  }),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Suppress console warnings in tests unless explicitly needed
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  jest.clearAllMocks();
});
