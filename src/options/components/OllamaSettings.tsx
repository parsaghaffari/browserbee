import React from 'react';

interface OllamaSettingsProps {
  ollamaApiKey: string;
  setOllamaApiKey: (key: string) => void;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
}

export function OllamaSettings({
  ollamaApiKey,
  setOllamaApiKey,
  ollamaBaseUrl,
  setOllamaBaseUrl
}: OllamaSettingsProps) {
  return (
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
  );
}
