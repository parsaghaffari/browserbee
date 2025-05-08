import { useState, useEffect } from 'react';
import { 
  anthropicModels, 
  openaiModels, 
  geminiModels, 
  ollamaModels,
  anthropicDefaultModelId,
  openaiDefaultModelId,
  geminiDefaultModelId,
  ollamaDefaultModelId
} from '../models/models';

export function Options() {
  // Function to process and sort model pricing data
  const getModelPricingData = () => {
    const allModels = [
      ...Object.entries(anthropicModels).map(([id, model]) => ({ 
        id, provider: 'Anthropic', ...model 
      })),
      ...Object.entries(openaiModels).map(([id, model]) => ({ 
        id, provider: 'OpenAI', ...model 
      })),
      ...Object.entries(geminiModels).map(([id, model]) => ({ 
        id, provider: 'Google', ...model 
      })),
      ...Object.entries(ollamaModels).map(([id, model]) => ({ 
        id, provider: 'Ollama', ...model 
      }))
    ];
    
    // Sort by output price (cheapest first)
    return allModels.sort((a, b) => a.outputPrice - b.outputPrice);
  };
  
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
  
  // Ollama settings
  const [ollamaApiKey, setOllamaApiKey] = useState('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('');
  
  // Model IDs - using defaults from models.ts
  const [anthropicModelId, setAnthropicModelId] = useState(anthropicDefaultModelId);
  const [openaiModelId, setOpenaiModelId] = useState(openaiDefaultModelId);
  const [geminiModelId, setGeminiModelId] = useState(geminiDefaultModelId);
  const [ollamaModelId, setOllamaModelId] = useState(ollamaDefaultModelId);
  
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
      anthropicModelId: anthropicDefaultModelId,
      anthropicBaseUrl: '',
      openaiApiKey: '',
      openaiModelId: openaiDefaultModelId,
      openaiBaseUrl: '',
      geminiApiKey: '',
      geminiModelId: geminiDefaultModelId,
      geminiBaseUrl: '',
      ollamaApiKey: '',
      ollamaModelId: ollamaDefaultModelId,
      ollamaBaseUrl: '',
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
      setOllamaApiKey(result.ollamaApiKey);
      setOllamaModelId(result.ollamaModelId);
      setOllamaBaseUrl(result.ollamaBaseUrl || '');
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
      ollamaApiKey,
      ollamaModelId,
      ollamaBaseUrl,
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
          <h2 className="card-title text-xl">About</h2>
          <p className="mb-3">
            BrowserBee 🐝 is a Chrome extension that allows you to control your browser using natural language.
            It supports multiple LLM providers including Anthropic, OpenAI, Google Gemini, and Ollama to interpret your instructions and uses Playwright to execute them.
          </p>
          <p>
            To use the extension, click on the extension icon to open the side panel, then enter your instructions
            in the prompt field and hit Enter.
          </p>
        </div>
      </div>

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
              <option value="ollama">Ollama</option>
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
          
          {/* Ollama settings */}
          {provider === 'ollama' && (
            <div className="border rounded-lg p-4 mb-4">
              <h3 className="font-bold mb-2">Ollama Settings</h3>
              
              <div className="form-control mb-4">
                <label htmlFor="ollama-api-key" className="label">
                  <span className="label-text">API Key (optional):</span>
                </label>
                <input
                  type="password"
                  id="ollama-api-key"
                  value={ollamaApiKey}
                  onChange={(e) => setOllamaApiKey(e.target.value)}
                  placeholder="Enter your Ollama API key if required"
                  className="input input-bordered w-full"
                />
                <label className="label">
                  <span className="label-text-alt">Ollama typically doesn't require an API key</span>
                </label>
              </div>
              
              <div className="form-control mb-4">
                <label htmlFor="ollama-base-url" className="label">
                  <span className="label-text">Base URL:</span>
                </label>
                <input
                  type="text"
                  id="ollama-base-url"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="Ollama server URL (default: http://localhost:11434)"
                  className="input input-bordered w-full"
                />
                <span className="label-text-alt">
                    If running Ollama locally, you need to enable CORS by setting <code>OLLAMA_ORIGINS=*</code> environment variable. 
                    <a href="https://objectgraph.com/blog/ollama-cors/" target="_blank" className="link link-primary ml-1">Learn more</a>
                  </span>
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
          <h2 className="card-title text-xl">Model Pricing</h2>
          <p className="mb-4">
            This table shows the relative costs of different LLM models, sorted from cheapest to most expensive.
            Prices are in USD per 1 million tokens.
          </p>
          
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Provider</th>
                  <th>Input Price</th>
                  <th>Output Price</th>
                </tr>
              </thead>
              <tbody>
                {getModelPricingData().map((model) => (
                  <tr key={`${model.provider}-${model.id}`}>
                    <td>{model.name}</td>
                    <td>{model.provider}</td>
                    <td>${model.inputPrice.toFixed(2)}</td>
                    <td>${model.outputPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            * Prices are per 1 million tokens. Actual costs may vary based on usage.
          </p>
        </div>
      </div>
    </div>
  );
}
