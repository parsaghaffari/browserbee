import { useEffect } from 'react';
import { ChromeMessage } from '../types';

interface UseChromeMessagingProps {
  tabId: number | null;
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
}

export const useChromeMessaging = ({
  tabId,
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
  setTabTitle
}: UseChromeMessagingProps) => {
  
  // Listen for updates from the background script
  useEffect(() => {
    const messageListener = (message: ChromeMessage) => {
      // Only process messages intended for this tab
      // If the message has a tabId, check if it matches this tab's ID
      // If the message doesn't have a tabId, process it (for backward compatibility)
      if (message.tabId && message.tabId !== tabId) {
        return; // Skip messages for other tabs
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
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [
    tabId,
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
    setTabTitle
  ]);

  const executePrompt = (prompt: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Send message to background script with tab ID
        chrome.runtime.sendMessage({ 
          action: 'executePrompt', 
          prompt,
          tabId 
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
      tabId 
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  };

  const clearHistory = () => {
    chrome.runtime.sendMessage({ 
      action: 'clearHistory', 
      tabId 
    });
  };

  const approveRequest = (requestId: string) => {
    chrome.runtime.sendMessage({ 
      action: 'approvalResponse',
      requestId,
      approved: true,
      tabId 
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  };

  const rejectRequest = (requestId: string) => {
    chrome.runtime.sendMessage({ 
      action: 'approvalResponse',
      requestId,
      approved: false,
      tabId 
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
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
