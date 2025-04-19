import { useState, useEffect } from 'react';
import './Options.css';

export function Options() {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Load saved API key when component mounts
  useEffect(() => {
    chrome.storage.sync.get(['anthropicApiKey'], (result) => {
      if (result.anthropicApiKey) {
        setApiKey(result.anthropicApiKey);
      }
    });
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setSaveStatus('');

    chrome.storage.sync.set({ anthropicApiKey: apiKey }, () => {
      setIsSaving(false);
      setSaveStatus('API key saved successfully!');
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    });
  };

  return (
    <div className="options-container">
      <h1>Playwright LLM Options</h1>
      
      <div className="option-section">
        <h2>API Configuration</h2>
        <p>
          Enter your Anthropic API key to use Claude 3 Sonnet (claude-3-7-sonnet-20250219).
          Your API key is stored securely in your browser's sync storage.
        </p>
        
        <div className="form-group">
          <label htmlFor="api-key">Anthropic API Key:</label>
          <input
            type="password"
            id="api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Anthropic API key"
            className="api-key-input"
          />
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={isSaving || !apiKey.trim()}
          className="save-button"
        >
          {isSaving ? 'Saving...' : 'Save API Key'}
        </button>
        
        {saveStatus && <div className="save-status">{saveStatus}</div>}
      </div>
      
      <div className="option-section">
        <h2>About</h2>
        <p>
          Playwright LLM is a Chrome extension that allows you to control your browser using natural language.
          It uses the Claude 3 Sonnet model to interpret your instructions and Playwright to execute them.
        </p>
        <p>
          To use the extension, click on the extension icon to open the side panel, then enter your instructions
          in the prompt field and click "Execute".
        </p>
      </div>
    </div>
  );
}
