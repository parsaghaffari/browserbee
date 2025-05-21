import React from 'react';

interface OpenAISettingsProps {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  openaiBaseUrl: string;
  setOpenaiBaseUrl: (url: string) => void;
}

export function OpenAISettings({
  openaiApiKey,
  setOpenaiApiKey,
  openaiBaseUrl,
  setOpenaiBaseUrl
}: OpenAISettingsProps) {
  return (
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
  );
}
