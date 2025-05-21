import React from 'react';

interface AnthropicSettingsProps {
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  anthropicBaseUrl: string;
  setAnthropicBaseUrl: (url: string) => void;
  thinkingBudgetTokens: number;
  setThinkingBudgetTokens: (tokens: number) => void;
}

export function AnthropicSettings({
  anthropicApiKey,
  setAnthropicApiKey,
  anthropicBaseUrl,
  setAnthropicBaseUrl,
  thinkingBudgetTokens,
  setThinkingBudgetTokens
}: AnthropicSettingsProps) {
  return (
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
  );
}
