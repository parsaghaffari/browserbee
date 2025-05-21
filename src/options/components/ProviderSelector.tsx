import React from 'react';

interface ProviderSelectorProps {
  provider: string;
  setProvider: (provider: string) => void;
}

export function ProviderSelector({ provider, setProvider }: ProviderSelectorProps) {
  return (
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
        <option value="openai-compatible">OpenAI Compatible</option>
      </select>
    </div>
  );
}
