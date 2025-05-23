import React from 'react';
import { OllamaModelList, OllamaModel } from './OllamaModelList';

interface OllamaSettingsProps {
  ollamaApiKey: string;
  setOllamaApiKey: (key: string) => void;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
  ollamaModelId: string;
  setOllamaModelId: (id: string) => void;
  ollamaCustomModels: OllamaModel[];
  setOllamaCustomModels: (models: OllamaModel[]) => void;
  newOllamaModel: { id: string; name: string; contextWindow: number };
  setNewOllamaModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; contextWindow: number }>>;
  handleAddOllamaModel: () => void;
  handleRemoveOllamaModel: (id: string) => void;
  handleEditOllamaModel: (idx: number, field: string, value: any) => void;
}

export function OllamaSettings({
  ollamaApiKey,
  setOllamaApiKey,
  ollamaBaseUrl,
  setOllamaBaseUrl,
  ollamaModelId,
  setOllamaModelId,
  ollamaCustomModels,
  setOllamaCustomModels,
  newOllamaModel,
  setNewOllamaModel,
  handleAddOllamaModel,
  handleRemoveOllamaModel,
  handleEditOllamaModel
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
          onChange={(e) => {
            const newValue = e.target.value;
            setOllamaBaseUrl(newValue);
            // Save the base URL immediately to trigger the provider selector update
            chrome.storage.sync.set({ ollamaBaseUrl: newValue });
          }}
          placeholder="Ollama server URL (default: http://localhost:11434)"
          className="input input-bordered w-full"
        />
        <span className="label-text-alt">
          If running Ollama locally, you need to enable CORS by setting <code>OLLAMA_ORIGINS=*</code> environment variable. 
          <a href="https://objectgraph.com/blog/ollama-cors/" target="_blank" className="link link-primary ml-1">Learn more</a>
        </span>
      </div>
      
      {ollamaCustomModels.length === 0 && (
        <div className="alert alert-info mb-4">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>You need to add at least one Ollama model below before you can use Ollama as a provider.</span>
          </div>
        </div>
      )}
      
      <OllamaModelList
        models={ollamaCustomModels}
        setModels={setOllamaCustomModels}
        newModel={newOllamaModel}
        setNewModel={setNewOllamaModel}
        handleAddModel={handleAddOllamaModel}
        handleRemoveModel={handleRemoveOllamaModel}
        handleEditModel={handleEditOllamaModel}
      />
    </div>
  );
}
