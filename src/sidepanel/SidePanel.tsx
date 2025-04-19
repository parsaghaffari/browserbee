import React, { useState, useEffect } from 'react';
import './SidePanel.css';

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
    <div className="sidepanel-container">
      <header className="header">
        <h1>Playwright LLM</h1>
      </header>

      <form onSubmit={handleSubmit} className="prompt-form">
        <textarea
          className="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt (e.g., 'go to google.com, search for Cicero, and click on the first result')"
          disabled={isProcessing}
          rows={4}
        />
        <button 
          type="submit" 
          className="submit-button"
          disabled={isProcessing || !prompt.trim()}
        >
          {isProcessing ? 'Processing...' : 'Execute'}
        </button>
      </form>

      <div className="output-container">
        <div className="output-panel">
          <h3>LLM Output</h3>
          <pre className="llm-output">{llmOutput || 'No output yet'}</pre>
        </div>
      </div>
    </div>
  );
}
