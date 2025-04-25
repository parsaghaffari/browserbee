import Anthropic from "@anthropic-ai/sdk";
import { BrowserAgent } from "../agent/agent";

// Message types
export interface ExecutePromptMessage {
  action: 'executePrompt';
  prompt: string;
  tabId?: number;
}

export interface CancelExecutionMessage {
  action: 'cancelExecution';
  tabId?: number;
}

export interface ClearHistoryMessage {
  action: 'clearHistory';
  tabId?: number;
}

export interface InitializeTabMessage {
  action: 'initializeTab';
  tabId: number;
  windowId?: number;
}

export type BackgroundMessage = 
  | ExecutePromptMessage
  | CancelExecutionMessage
  | ClearHistoryMessage
  | InitializeTabMessage;

// UI Message types
export interface UpdateOutputMessage {
  action: 'updateOutput';
  content: {
    type: 'system' | 'llm' | 'screenshot';
    content: string;
    imageData?: string;
    mediaType?: string;
  };
  tabId?: number;
}

export interface UpdateStreamingChunkMessage {
  action: 'updateStreamingChunk';
  content: {
    type: 'llm';
    content: string;
  };
  tabId?: number;
}

export interface FinalizeStreamingSegmentMessage {
  action: 'finalizeStreamingSegment';
  content: {
    id: number;
    content: string;
  };
  tabId?: number;
}

export interface StartNewSegmentMessage {
  action: 'startNewSegment';
  content: {
    id: number;
  };
  tabId?: number;
}

export interface StreamingCompleteMessage {
  action: 'streamingComplete';
  content: null;
  tabId?: number;
}

export interface ProcessingCompleteMessage {
  action: 'processingComplete';
  content: null;
  tabId?: number;
}

export interface RateLimitMessage {
  action: 'rateLimit';
  content: {
    isRetrying: boolean;
  };
  tabId?: number;
}

export interface FallbackStartedMessage {
  action: 'fallbackStarted';
  content: {
    message: string;
  };
  tabId?: number;
}

export interface UpdateScreenshotMessage {
  action: 'updateScreenshot';
  content: {
    type: 'screenshot';
    content: string;
    imageData: string;
    mediaType: string;
  };
  tabId?: number;
}

export type UIMessage =
  | UpdateOutputMessage
  | UpdateStreamingChunkMessage
  | FinalizeStreamingSegmentMessage
  | StartNewSegmentMessage
  | StreamingCompleteMessage
  | ProcessingCompleteMessage
  | RateLimitMessage
  | FallbackStartedMessage
  | UpdateScreenshotMessage;

// Callback types
export interface ExecutePromptCallbacks {
  onLlmChunk?: (s: string) => void;
  onLlmOutput: (s: string) => void;
  onToolOutput: (s: string) => void;
  onComplete: () => void;
  onError?: (error: any) => void;
  onToolStart?: (toolName: string, toolInput: string) => void;
  onToolEnd?: (result: string) => void;
  onSegmentComplete?: (segment: string) => void;
  onFallbackStarted?: () => void;
}

// State types
export interface TabState {
  agent: BrowserAgent | null;
  page: any;
  windowId?: number;
  title?: string;
}
