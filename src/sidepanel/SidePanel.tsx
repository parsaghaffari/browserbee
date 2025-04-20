import React, { useState, useEffect } from 'react';

export function SidePanel() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [llmOutput, setLlmOutput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);
    setLlmOutput('');

    try {
      // Send message to background script
      chrome.runtime.sendMessage({ 
        action: 'executePrompt', 
        prompt 
      }, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          setLlmOutput('Error: ' + chrome.runtime.lastError.message);
          setIsProcessing(false);
          return;
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setLlmOutput('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    chrome.runtime.sendMessage({ 
      action: 'cancelExecution' 
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  };

  // Listen for updates from the background script
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'updateLlmOutput') {
        setLlmOutput(prev => prev + message.content);
      } else if (message.action === 'processingComplete') {
        setIsProcessing(false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  return (
    <div className="flex flex-col h-screen p-4 bg-base-200">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-primary">Browser LLM ✨</h1>
        <p className="text-sm text-gray-600">
          What can I do for you today?
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col mb-4">
        <textarea
          className="textarea textarea-bordered w-full mb-2"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt (e.g., 'go to google.com, search for Cicero, and click on the first result')"
          disabled={isProcessing}
          rows={4}
        />
        <div className="flex justify-end gap-2">
          {isProcessing && (
            <button 
              type="button" 
              onClick={handleCancel}
              className="btn btn-error"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isProcessing || !prompt.trim()}
          >
            {isProcessing ? 'Processing...' : 'Execute'}
          </button>
        </div>
      </form>

      <div className="flex flex-col flex-grow gap-4 overflow-hidden md:flex-row">
        <div className="card bg-base-100 shadow-md flex-1 flex flex-col overflow-hidden">
          <div className="card-title p-3 bg-base-300 text-base-content text-lg">
            LLM Output
          </div>
          <pre className="card-body p-3 overflow-auto font-mono text-sm whitespace-pre-wrap bg-base-100 flex-1">
            {llmOutput || 'No output yet'}
          </pre>
        </div>
      </div>
    </div>
  );
}
