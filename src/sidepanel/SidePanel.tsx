import React from 'react';
import { useTabManagement } from './hooks/useTabManagement';
import { useMessageManagement } from './hooks/useMessageManagement';
import { useChromeMessaging } from './hooks/useChromeMessaging';
import { MessageDisplay } from './components/MessageDisplay';
import { PromptForm } from './components/PromptForm';
import { OutputHeader } from './components/OutputHeader';
import { TabStatusBar } from './components/TabStatusBar';

export function SidePanel() {
  // Use custom hooks to manage state and functionality
  const { 
    tabId, 
    tabTitle, 
    setTabTitle 
  } = useTabManagement();
  
  const {
    messages,
    showSystemMessages,
    setShowSystemMessages,
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

  // Set up Chrome messaging with callbacks
  const { 
    executePrompt, 
    cancelExecution, 
    clearHistory 
  } = useChromeMessaging({
    tabId,
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
    setTabTitle
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
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-base-200">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-primary">BrowserBee 🐝</h1>
        <p className="text-sm text-gray-600 mt-2">
          What can I do for you today?
        </p>
      </header>

      <PromptForm 
        onSubmit={handleSubmit}
        onCancel={cancelExecution}
        isProcessing={isProcessing}
      />

      <div className="flex flex-col flex-grow gap-4 overflow-hidden md:flex-row">
        <div className="card bg-base-100 shadow-md flex-1 flex flex-col overflow-hidden">
          <OutputHeader 
            showSystemMessages={showSystemMessages}
            setShowSystemMessages={setShowSystemMessages}
            onClearHistory={handleClearHistory}
          />
          <div 
            ref={outputRef}
            className="card-body p-3 overflow-auto bg-base-100 flex-1"
          >
            <MessageDisplay 
              messages={messages}
              streamingSegments={streamingSegments}
              isStreaming={isStreaming}
              showSystemMessages={showSystemMessages}
            />
          </div>
        </div>
      </div>
      
      <TabStatusBar 
        tabId={tabId}
        tabTitle={tabTitle}
      />
    </div>
  );
}
