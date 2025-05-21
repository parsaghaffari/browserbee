import React from 'react';

interface GeminiSettingsProps {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (url: string) => void;
}

export function GeminiSettings({
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl
}: GeminiSettingsProps) {
  return (
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
  );
}
