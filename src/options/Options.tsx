import { useState, useEffect } from 'react';

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
    <div className="max-w-3xl mx-auto p-5 font-sans text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-primary">Browser LLM ✨</h1>
      
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body">
          <h2 className="card-title text-xl">API Configuration</h2>
          <p className="mb-4">
            Enter your Anthropic API key to use Claude 3 Sonnet (claude-3-7-sonnet-20250219).
            Your API key is stored securely in your browser's sync storage.
          </p>
          
          <div className="form-control mb-4">
            <label htmlFor="api-key" className="label">
              <span className="label-text font-medium">Anthropic API Key:</span>
            </label>
            <input
              type="password"
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Anthropic API key"
              className="input input-bordered w-full"
            />
          </div>
          
          <button 
            onClick={handleSave} 
            disabled={isSaving || !apiKey.trim()}
            className="btn btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save API Key'}
          </button>
          
          {saveStatus && <div className="alert alert-success mt-4">{saveStatus}</div>}
        </div>
      </div>
      
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl">About</h2>
          <p className="mb-3">
            Browser LLM ✨ is a Chrome extension that allows you to control your browser using natural language.
            It uses the Claude 3 Sonnet model to interpret your instructions and Playwright to execute them.
          </p>
          <p>
            To use the extension, click on the extension icon to open the side panel, then enter your instructions
            in the prompt field and click "Execute".
          </p>
        </div>
      </div>
    </div>
  );
}
