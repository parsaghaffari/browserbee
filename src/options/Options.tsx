import { useState, useEffect } from 'react';

export function Options() {
  // Provider selection
  const [provider, setProvider] = useState('anthropic');
  
  // Anthropic settings
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState('');
  
  // OpenAI settings
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  
  // Gemini settings
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiBaseUrl, setGeminiBaseUrl] = useState('');
  
  // Hidden model IDs (kept for compatibility)
  const [anthropicModelId, setAnthropicModelId] = useState('claude-3-7-sonnet-20250219');
  const [openaiModelId, setOpenaiModelId] = useState('gpt-4o');
  const [geminiModelId, setGeminiModelId] = useState('gemini-1.5-pro');
  
  // Common settings
  const [thinkingBudgetTokens, setThinkingBudgetTokens] = useState(0);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Load saved settings when component mounts
  useEffect(() => {
    chrome.storage.sync.get({
      provider: 'anthropic',
      anthropicApiKey: '',
      anthropicModelId: 'claude-3-7-sonnet-20250219',
      anthropicBaseUrl: '',
      openaiApiKey: '',
      openaiModelId: 'gpt-4o',
      openaiBaseUrl: '',
      geminiApiKey: '',
      geminiModelId: 'gemini-1.5-pro',
      geminiBaseUrl: '',
      thinkingBudgetTokens: 0,
    }, (result) => {
      setProvider(result.provider);
      setAnthropicApiKey(result.anthropicApiKey);
      setAnthropicModelId(result.anthropicModelId);
      setAnthropicBaseUrl(result.anthropicBaseUrl);
      setOpenaiApiKey(result.openaiApiKey);
      setOpenaiModelId(result.openaiModelId);
      setOpenaiBaseUrl(result.openaiBaseUrl);
      setGeminiApiKey(result.geminiApiKey);
      setGeminiModelId(result.geminiModelId);
      setGeminiBaseUrl(result.geminiBaseUrl);
      setThinkingBudgetTokens(result.thinkingBudgetTokens);
    });
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setSaveStatus('');

    chrome.storage.sync.set({
      provider,
      anthropicApiKey,
      anthropicModelId,
      anthropicBaseUrl,
      openaiApiKey,
      openaiModelId,
      openaiBaseUrl,
      geminiApiKey,
      geminiModelId,
      geminiBaseUrl,
      thinkingBudgetTokens,
    }, () => {
      setIsSaving(false);
      setSaveStatus('Settings saved successfully!');
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-5 font-sans text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-primary">BrowserBee 🐝</h1>
      
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body">
          <h2 className="card-title text-xl">LLM Provider Configuration</h2>
          <p className="mb-4">
            Configure your preferred LLM provider and API settings.
            Your API keys are stored securely in your browser's storage.
          </p>
          
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">LLM Provider:</span>
            </label>
            <select 
              className="select select-bordered" 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="gemini">Google (Gemini)</option>
            </select>
          </div>
          
          {/* Anthropic settings */}
          {provider === 'anthropic' && (
            <div className="border rounded-lg p-4 mb-4">
              <h3 className="font-bold mb-2">Anthropic Settings</h3>
              
              <div className="form-control mb-4">
                <label htmlFor="anthropic-api-key" className="label">
                  <span className="label-text">API Key:</span>
                </label>
                <input
                  type="password"
                  id="anthropic-api-key"
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  placeholder="Enter your Anthropic API key"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div className="form-control mb-4">
                <label htmlFor="anthropic-base-url" className="label">
                  <span className="label-text">Base URL (optional):</span>
                </label>
                <input
                  type="text"
                  id="anthropic-base-url"
                  value={anthropicBaseUrl}
                  onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                  placeholder="Custom base URL (leave empty for default)"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div className="form-control mb-4">
                <label htmlFor="thinking-budget" className="label">
                  <span className="label-text">Thinking Budget (tokens):</span>
                </label>
                <input
                  type="number"
                  id="thinking-budget"
                  value={thinkingBudgetTokens}
                  onChange={(e) => setThinkingBudgetTokens(parseInt(e.target.value) || 0)}
                  placeholder="0 to disable thinking"
                  className="input input-bordered w-full"
                  min="0"
                />
                <label className="label">
                  <span className="label-text-alt">Set to 0 to disable Claude's thinking feature</span>
                </label>
              </div>
            </div>
          )}
          
          {/* OpenAI settings */}
          {provider === 'openai' && (
            <div className="border rounded-lg p-4 mb-4">
              <h3 className="font-bold mb-2">OpenAI Settings</h3>
              
              <div className="form-control mb-4">
                <label htmlFor="openai-api-key" className="label">
                  <span className="label-text">API Key:</span>
                </label>
                <input
                  type="password"
                  id="openai-api-key"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div className="form-control mb-4">
                <label htmlFor="openai-base-url" className="label">
                  <span className="label-text">Base URL (optional):</span>
                </label>
                <input
                  type="text"
                  id="openai-base-url"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="Custom base URL (leave empty for default)"
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          )}
          
          {/* Gemini settings */}
          {provider === 'gemini' && (
            <div className="border rounded-lg p-4 mb-4">
              <h3 className="font-bold mb-2">Google Gemini Settings</h3>
              
              <div className="form-control mb-4">
                <label htmlFor="gemini-api-key" className="label">
                  <span className="label-text">API Key:</span>
                </label>
                <input
                  type="password"
                  id="gemini-api-key"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Google AI API key"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div className="form-control mb-4">
                <label htmlFor="gemini-base-url" className="label">
                  <span className="label-text">Base URL (optional):</span>
                </label>
                <input
                  type="text"
                  id="gemini-base-url"
                  value={geminiBaseUrl}
                  onChange={(e) => setGeminiBaseUrl(e.target.value)}
                  placeholder="Custom base URL (leave empty for default)"
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          )}
          
          <button 
            onClick={handleSave} 
            disabled={isSaving || (
              (provider === 'anthropic' && !anthropicApiKey.trim()) ||
              (provider === 'openai' && !openaiApiKey.trim()) ||
              (provider === 'gemini' && !geminiApiKey.trim())
            )}
            className="btn btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          
          {saveStatus && <div className="alert alert-success mt-4">{saveStatus}</div>}
        </div>
      </div>
      
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl">About</h2>
          <p className="mb-3">
            BrowserBee 🐝 is a Chrome extension that allows you to control your browser using natural language.
            It supports multiple LLM providers including Anthropic Claude, OpenAI GPT, and Google Gemini to interpret your instructions and uses Playwright to execute them.
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
