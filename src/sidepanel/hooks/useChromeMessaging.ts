import { useEffect } from 'react';
import { ChromeMessage } from '../types';

interface UseChromeMessagingProps {
  tabId: number | null;
  windowId?: number | null;
  onUpdateOutput: (content: any) => void;
  onUpdateStreamingChunk: (content: any) => void;
  onFinalizeStreamingSegment: (id: number, content: string) => void;
  onStartNewSegment: (id: number) => void;
  onStreamingComplete: () => void;
  onUpdateLlmOutput: (content: string) => void;
  onRateLimit: () => void;
  onFallbackStarted: (message: string) => void;
  onUpdateScreenshot: (content: any) => void;
  onProcessingComplete: () => void;
  onRequestApproval?: (request: { requestId: string, toolName: string, toolInput: string, reason: string }) => void;
  setTabTitle: (title: string) => void;
  onTabStatusChanged?: (status: 'attached' | 'detached', tabId: number) => void;
  onTargetCreated?: (tabId: number, targetInfo: any) => void;
  onTargetDestroyed?: (tabId: number, url: string) => void;
  onTargetChanged?: (tabId: number, url: string) => void;
  onActiveTabChanged?: (oldTabId: number, newTabId: number, title: string, url: string) => void;
  onPageDialog?: (tabId: number, dialogInfo: any) => void;
  onPageConsole?: (tabId: number, consoleInfo: any) => void;
  onPageError?: (tabId: number, error: string) => void;
}

export const useChromeMessaging = ({
  tabId,
  windowId,
  onUpdateOutput,
  onUpdateStreamingChunk,
  onFinalizeStreamingSegment,
  onStartNewSegment,
  onStreamingComplete,
  onUpdateLlmOutput,
  onRateLimit,
  onFallbackStarted,
  onUpdateScreenshot,
  onProcessingComplete,
  onRequestApproval,
  setTabTitle,
  onTabStatusChanged,
  onTargetCreated,
  onTargetDestroyed,
  onTargetChanged,
  onActiveTabChanged,
  onPageDialog,
  onPageConsole,
  onPageError
}: UseChromeMessagingProps) => {
  
  // Listen for updates from the background script
  useEffect(() => {
    const messageListener = (message: ChromeMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      // Only process messages intended for this tab and window
      // If the message has a tabId, check if it matches this tab's ID
      // If the message has a windowId, check if it matches this window's ID
      // If the message doesn't have a tabId or windowId, process it (for backward compatibility)
      if ((message.tabId && message.tabId !== tabId) || 
          (message.windowId && windowId && message.windowId !== windowId)) {
        return false; // Skip messages for other tabs or windows
      }
      
      if (message.action === 'updateOutput') {
        // For complete messages (system messages or non-streaming LLM output)
        onUpdateOutput(message.content);
        
        // Check if this is a system message about tab connection
        if (message.content?.type === 'system' && 
            typeof message.content.content === 'string' && 
            message.content.content.startsWith('Connected to tab:')) {
          // Extract the tab title from the message
          const titleMatch = message.content.content.match(/Connected to tab: (.+)/);
          if (titleMatch && titleMatch[1]) {
            setTabTitle(titleMatch[1]);
          }
        }
      } else if (message.action === 'updateStreamingChunk') {
        // For streaming chunks
        onUpdateStreamingChunk(message.content);
      } else if (message.action === 'finalizeStreamingSegment') {
        // Finalize a streaming segment
        const { id, content } = message.content;
        onFinalizeStreamingSegment(id, content);
      } else if (message.action === 'startNewSegment') {
        // Start a new streaming segment
        const { id } = message.content;
        onStartNewSegment(id);
      } else if (message.action === 'streamingComplete') {
        // When streaming is complete
        onStreamingComplete();
      } else if (message.action === 'updateLlmOutput') {
        // Handle legacy format for backward compatibility
        onUpdateLlmOutput(message.content);
      } else if (message.action === 'rateLimit') {
        // Handle rate limit notification
        onRateLimit();
      } else if (message.action === 'fallbackStarted') {
        // Handle fallback notification
        onFallbackStarted(message.content?.message || "Switching to fallback mode. Processing continues...");
      } else if (message.action === 'updateScreenshot') {
        // Handle screenshot messages
        onUpdateScreenshot(message.content);
      } else if (message.action === 'processingComplete') {
        onProcessingComplete();
      } else if (message.action === 'requestApproval' && onRequestApproval) {
        // Handle approval requests
        if (message.requestId && message.toolName && message.toolInput) {
          onRequestApproval({
            requestId: message.requestId,
            toolName: message.toolName,
            toolInput: message.toolInput,
            reason: message.reason || 'This action requires approval.'
          });
          // Send a response to keep the message channel open
          sendResponse({ success: true });
          return true; // Keep the message channel open for async response
        } else {
          console.warn('Received incomplete requestApproval message');
          sendResponse({ success: false, error: 'Incomplete approval request' });
        }
      } 
      else if (message.action === 'tabStatusChanged' && onTabStatusChanged && message.status && message.tabId) {
        onTabStatusChanged(message.status, message.tabId);
      } else if (message.action === 'targetCreated' && onTargetCreated && message.tabId && message.targetInfo) {
        onTargetCreated(message.tabId, message.targetInfo);
      } else if (message.action === 'targetDestroyed' && onTargetDestroyed && message.tabId && message.url) {
        onTargetDestroyed(message.tabId, message.url);
      } else if (message.action === 'targetChanged' && onTargetChanged && message.tabId && message.url) {
        onTargetChanged(message.tabId, message.url);
      } else if (message.action === 'activeTabChanged' && message.oldTabId && message.newTabId) {
        // Special handling for active tab changed message
        // This message is sent when the agent switches tabs
        console.log(`Active tab changed from ${message.oldTabId} to ${message.newTabId}`);
        
        // Update the UI's tabId state by sending a special message to SidePanel
        chrome.runtime.sendMessage({
          action: 'updateActiveTab',
          oldTabId: message.oldTabId,
          newTabId: message.newTabId,
          title: message.title || 'Unknown Tab',
          url: message.url || 'about:blank'
        });
        
        // If there's a callback for this event, call it
        if (onActiveTabChanged) {
          onActiveTabChanged(
            message.oldTabId, 
            message.newTabId, 
            message.title || 'Unknown Tab', 
            message.url || 'about:blank'
          );
        }
        
        // Update the tab title in the UI
        if (setTabTitle && message.title) {
          setTabTitle(message.title);
        }
      } else if (message.action === 'tabTitleChanged' && setTabTitle && message.title) {
        setTabTitle(message.title);
      } else if (message.action === 'pageDialog' && onPageDialog && message.tabId && message.dialogInfo) {
        onPageDialog(message.tabId, message.dialogInfo);
      } else if (message.action === 'pageConsole' && onPageConsole && message.tabId && message.consoleInfo) {
        onPageConsole(message.tabId, message.consoleInfo);
      } else if (message.action === 'pageError' && onPageError && message.tabId && message.error) {
        onPageError(message.tabId, message.error);
      }
      
      // Send a response for any message that doesn't explicitly return true
      sendResponse({ success: true });
      return false; // Don't keep the message channel open by default
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [
    tabId,
    windowId,
    onUpdateOutput,
    onUpdateStreamingChunk,
    onFinalizeStreamingSegment,
    onStartNewSegment,
    onStreamingComplete,
    onUpdateLlmOutput,
    onRateLimit,
    onFallbackStarted,
    onUpdateScreenshot,
    onProcessingComplete,
    onRequestApproval,
    setTabTitle,
    onTabStatusChanged,
    onTargetCreated,
    onTargetDestroyed,
    onTargetChanged,
    onActiveTabChanged,
    onPageDialog,
    onPageConsole,
    onPageError
  ]);

  const executePrompt = (prompt: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Send message to background script with tab ID
        chrome.runtime.sendMessage({ 
          action: 'executePrompt', 
          prompt,
          tabId,
          windowId
        }, () => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.error(lastError);
            reject(lastError);
            return;
          }
          resolve();
        });
      } catch (error) {
        console.error('Error:', error);
        reject(error);
      }
    });
  };

  const cancelExecution = () => {
    chrome.runtime.sendMessage({ 
      action: 'cancelExecution',
      tabId,
      windowId
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  };

  const clearHistory = () => {
    chrome.runtime.sendMessage({ 
      action: 'clearHistory', 
      tabId,
      windowId
    });
  };

  const approveRequest = (requestId: string) => {
    chrome.runtime.sendMessage({ 
      action: 'approvalResponse',
      requestId,
      approved: true,
      tabId,
      windowId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending approval response:', chrome.runtime.lastError);
      }
    });
  };

  const rejectRequest = (requestId: string) => {
    chrome.runtime.sendMessage({ 
      action: 'approvalResponse',
      requestId,
      approved: false,
      tabId,
      windowId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending rejection response:', chrome.runtime.lastError);
      }
    });
  };

  return {
    executePrompt,
    cancelExecution,
    clearHistory,
    approveRequest,
    rejectRequest
  };
};
