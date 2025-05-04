import Anthropic from "@anthropic-ai/sdk";
import { BrowserAgent } from "../agent/AgentCore";

// Provider types
export type ProviderType = 'anthropic' | 'openai' | 'gemini';

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

export interface SwitchToTabMessage {
  action: 'switchToTab';
  tabId: number;
  windowId?: number;
}

export interface GetTokenUsageMessage {
  action: 'getTokenUsage';
}

export interface ApprovalResponseMessage {
  action: 'approvalResponse';
  requestId: string;
  approved: boolean;
}

export interface ReflectAndLearnMessage {
  action: 'reflectAndLearn';
  tabId?: number;
}

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

export interface TokenUsageUpdatedMessage {
  action: 'tokenUsageUpdated';
  content: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  tabId?: number;
}

export interface RequestApprovalMessage {
  action: 'requestApproval';
  requestId: string;
  toolName: string;
  toolInput: string;
  reason: string;
  tabId?: number;
}

export type BackgroundMessage = 
  | ExecutePromptMessage
  | CancelExecutionMessage
  | ClearHistoryMessage
  | InitializeTabMessage
  | SwitchToTabMessage
  | GetTokenUsageMessage
  | ApprovalResponseMessage
  | ReflectAndLearnMessage
  | TokenUsageUpdatedMessage
  | UpdateOutputMessage;

// New message types for enhanced tab management
export interface TabStatusChangedMessage {
  action: 'tabStatusChanged';
  status: 'attached' | 'detached';
  tabId: number;
}

export interface TargetCreatedMessage {
  action: 'targetCreated';
  tabId: number;
  targetInfo: {
    type: string;
    url: string;
  };
}

export interface TargetDestroyedMessage {
  action: 'targetDestroyed';
  tabId: number;
  url: string;
}

export interface TargetChangedMessage {
  action: 'targetChanged';
  tabId: number;
  url: string;
}

export interface TabTitleChangedMessage {
  action: 'tabTitleChanged';
  tabId: number;
  title: string;
}

export interface PageDialogMessage {
  action: 'pageDialog';
  tabId: number;
  dialogInfo: {
    type: string;
    message: string;
  };
}

export interface PageConsoleMessage {
  action: 'pageConsole';
  tabId: number;
  consoleInfo: {
    type: string;
    text: string;
  };
}

export interface PageErrorMessage {
  action: 'pageError';
  tabId: number;
  error: string;
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
  | UpdateScreenshotMessage
  | TokenUsageUpdatedMessage
  | RequestApprovalMessage
  | TabStatusChangedMessage
  | TargetCreatedMessage
  | TargetDestroyedMessage
  | TargetChangedMessage
  | TabTitleChangedMessage
  | PageDialogMessage
  | PageConsoleMessage
  | PageErrorMessage;

// State types
export interface TabState {
  agent: BrowserAgent | null;
  page: any;
  windowId?: number;
  title?: string;
}
