import React, { useState, useEffect } from 'react';
import { useTabManagement } from './hooks/useTabManagement';
import { useMessageManagement } from './hooks/useMessageManagement';
import { useChromeMessaging } from './hooks/useChromeMessaging';
import { MessageDisplay } from './components/MessageDisplay';
import { PromptForm } from './components/PromptForm';
import { OutputHeader } from './components/OutputHeader';
import { TabStatusBar } from './components/TabStatusBar';
import { TokenUsageDisplay } from './components/TokenUsageDisplay';
import { TokenTrackingService } from '../tracking/tokenTrackingService';
import { ApprovalRequest } from './components/ApprovalRequest';
import { ProviderSelector } from './components/ProviderSelector';
import { ConfigManager } from '../background/configManager';

export function SidePanel() {
  // State for tab status
  const [tabStatus, setTabStatus] = useState<'attached' | 'detached' | 'unknown'>('unknown');
  
  // State for approval requests
  const [approvalRequests, setApprovalRequests] = useState<Array<{
    requestId: string;
    toolName: string;
    toolInput: string;
    reason: string;
  }>>([]);

  // State to track if any LLM providers are configured
  const [hasConfiguredProviders, setHasConfiguredProviders] = useState<boolean>(false);
  
  // Check if any providers are configured when component mounts
  useEffect(() => {
    const checkProviders = async () => {
      const configManager = ConfigManager.getInstance();
      const providers = await configManager.getConfiguredProviders();
      setHasConfiguredProviders(providers.length > 0);
    };
    
    checkProviders();
    
    // Listen for provider configuration changes
    const handleMessage = (message: any) => {
      if (message.action === 'providerConfigChanged') {
        checkProviders();
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Use custom hooks to manage state and functionality
  const { 
    tabId, 
    windowId,
    tabTitle, 
    setTabTitle 
  } = useTabManagement();
  
  const {
    messages,
    streamingSegments,
    isStreaming,
    isProcessing,
    setIsProcessing,
    outputRef,
    addMessage,
    addSystemMessage,
    updateStreamingChunk,
    finalizeStreamingSegment,
    startNewSegment,
    completeStreaming,
    clearMessages,
    currentSegmentId
  } = useMessageManagement();

  // Handlers for approval requests
  const handleApprove = (requestId: string) => {
    // Send approval to the background script
    approveRequest(requestId);
    // Remove the request from the list
    setApprovalRequests(prev => prev.filter(req => req.requestId !== requestId));
    // Add a system message to indicate approval
    addSystemMessage(`✅ Approved action: ${requestId}`);
  };

  const handleReject = (requestId: string) => {
    // Send rejection to the background script
    rejectRequest(requestId);
    // Remove the request from the list
    setApprovalRequests(prev => prev.filter(req => req.requestId !== requestId));
    // Add a system message to indicate rejection
    addSystemMessage(`❌ Rejected action: ${requestId}`);
  };

  // Set up Chrome messaging with callbacks
  const { 
    executePrompt, 
    cancelExecution, 
    clearHistory,
    approveRequest,
    rejectRequest
  } = useChromeMessaging({
    tabId,
    windowId,
    onUpdateOutput: (content) => {
      addMessage({ ...content, isComplete: true });
    },
    onUpdateStreamingChunk: (content) => {
      updateStreamingChunk(content.content);
    },
    onFinalizeStreamingSegment: (id, content) => {
      finalizeStreamingSegment(id, content);
    },
    onStartNewSegment: (id) => {
      startNewSegment(id);
    },
    onStreamingComplete: () => {
      completeStreaming();
    },
    onUpdateLlmOutput: (content) => {
      addMessage({ type: 'llm', content, isComplete: true });
    },
    onRateLimit: () => {
      addSystemMessage("⚠️ Rate limit reached. Retrying automatically...");
    },
    onFallbackStarted: (message) => {
      addSystemMessage(message);
    },
    onUpdateScreenshot: (content) => {
      addMessage({ ...content, isComplete: true });
    },
    onProcessingComplete: () => {
      setIsProcessing(false);
      completeStreaming();
    },
    onRequestApproval: (request) => {
      // Add the request to the list
      setApprovalRequests(prev => [...prev, request]);
    },
    setTabTitle,
    // New event handlers for tab events
    onTabStatusChanged: (status, tabId) => {
      // Update the tab status state
      setTabStatus(status);
    },
    onTargetChanged: (tabId, url) => {
      // We don't need to do anything here as TabStatusBar handles this
    },
    onActiveTabChanged: (oldTabId, newTabId, title, url) => {
      // Update the tab title when the agent switches tabs
      console.log(`SidePanel: Active tab changed from ${oldTabId} to ${newTabId}`);
      setTabTitle(title);
      
      // Add a system message to indicate the tab change
      addSystemMessage(`Switched to tab: ${title} (${url})`);
    },
    onPageDialog: (tabId, dialogInfo) => {
      // Add a system message about the dialog
      addSystemMessage(`📢 Dialog: ${dialogInfo.type} - ${dialogInfo.message}`);
    },
    onPageError: (tabId, error) => {
      // Add a system message about the error
      addSystemMessage(`❌ Page Error: ${error}`);
    }
  });

  // Handle form submission
  const handleSubmit = async (prompt: string) => {
    setIsProcessing(true);
    
    // Add a system message to indicate a new prompt
    addSystemMessage(`New prompt: "${prompt}"`);

    try {
      await executePrompt(prompt);
    } catch (error) {
      console.error('Error:', error);
      addSystemMessage('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsProcessing(false);
    }
  };

  // Handle clearing history
  const handleClearHistory = () => {
    clearMessages();
    clearHistory();
    
    // Reset token tracking
    const tokenTracker = TokenTrackingService.getInstance();
    tokenTracker.reset();
  };
  
  // Handle reflect and learn
  const handleReflectAndLearn = () => {
    // Send message to background script to trigger reflection
    chrome.runtime.sendMessage({
      action: 'reflectAndLearn',
      tabId
    });
    
    // Add a system message to indicate reflection is happening
    addSystemMessage("🧠 Reflecting on this session to learn useful patterns...");
  };

  // Function to navigate to the options page
  const navigateToOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-base-200">
      <header className="mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">BrowserBee 🐝</h1>
        <TabStatusBar 
          tabId={tabId}
          tabTitle={tabTitle}
          tabStatus={tabStatus}
        />
      </div>
      <p className="text-sm text-gray-600 mt-2">
          What can I do for you today?
        </p>
      </header>

      {hasConfiguredProviders ? (
        <>
          <div className="flex flex-col flex-grow gap-4 overflow-hidden md:flex-row shadow-sm">
            <div className="card bg-base-100 shadow-md flex-1 flex flex-col overflow-hidden">
              <OutputHeader 
                onClearHistory={handleClearHistory}
                onReflectAndLearn={handleReflectAndLearn}
                isProcessing={isProcessing}
              />
              <div 
                ref={outputRef}
                className="card-body p-3 overflow-auto bg-base-100 flex-1"
              >
                <MessageDisplay 
                  messages={messages}
                  streamingSegments={streamingSegments}
                  isStreaming={isStreaming}
                />
              </div>
            </div>
          </div>
          
          {/* Add Token Usage Display */}
          <TokenUsageDisplay />
          
          {/* Display approval requests */}
          {approvalRequests.map(req => (
            <ApprovalRequest
              key={req.requestId}
              requestId={req.requestId}
              toolName={req.toolName}
              toolInput={req.toolInput}
              reason={req.reason}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
          
          <PromptForm 
            onSubmit={handleSubmit}
            onCancel={cancelExecution}
            isProcessing={isProcessing}
            tabStatus={tabStatus}
          />
          <ProviderSelector isProcessing={isProcessing} />
        </>
      ) : (
        <div className="flex flex-col flex-grow items-center justify-center">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">No LLM provider configured</h2>
            <p className="text-gray-600 mb-4">
              You need to configure an LLM provider before you can use BrowserBee.
            </p>
            <button 
              onClick={navigateToOptions}
              className="btn btn-primary"
            >
              Configure Providers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
