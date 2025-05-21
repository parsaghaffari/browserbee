import React from 'react';
import { ModelList, Model } from './ModelList';

interface OpenAICompatibleSettingsProps {
  openaiCompatibleApiKey: string;
  setOpenaiCompatibleApiKey: (key: string) => void;
  openaiCompatibleBaseUrl: string;
  setOpenaiCompatibleBaseUrl: (url: string) => void;
  openaiCompatibleModelId: string;
  setOpenaiCompatibleModelId: (id: string) => void;
  openaiCompatibleModels: Model[];
  setOpenaiCompatibleModels: (models: Model[]) => void;
  newModel: { id: string; name: string; isReasoningModel: boolean };
  setNewModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; isReasoningModel: boolean }>>;
  handleAddModel: () => void;
  handleRemoveModel: (id: string) => void;
  handleEditModel: (idx: number, field: string, value: any) => void;
}

export function OpenAICompatibleSettings({
  openaiCompatibleApiKey,
  setOpenaiCompatibleApiKey,
  openaiCompatibleBaseUrl,
  setOpenaiCompatibleBaseUrl,
  openaiCompatibleModelId,
  setOpenaiCompatibleModelId,
  openaiCompatibleModels,
  setOpenaiCompatibleModels,
  newModel,
  setNewModel,
  handleAddModel,
  handleRemoveModel,
  handleEditModel
}: OpenAICompatibleSettingsProps) {
  return (
    <div className="border rounded-lg p-4 mb-4">
      <h3 className="font-bold mb-2">OpenAI Compatible Settings</h3>
      <div className="form-control mb-4">
        <label htmlFor="openai-compatible-api-key" className="label">
          <span className="label-text">API Key:</span>
        </label>
        <input
          type="password"
          id="openai-compatible-api-key"
          value={openaiCompatibleApiKey}
          onChange={e => setOpenaiCompatibleApiKey(e.target.value)}
          placeholder="Enter your OpenAI-Compatible API key"
          className="input input-bordered w-full"
        />
      </div>
      <div className="form-control mb-4">
        <label htmlFor="openai-compatible-base-url" className="label">
          <span className="label-text">Base URL:</span>
        </label>
        <input
          type="text"
          id="openai-compatible-base-url"
          value={openaiCompatibleBaseUrl}
          onChange={e => setOpenaiCompatibleBaseUrl(e.target.value)}
          placeholder="Custom base URL (leave empty for default)"
          className="input input-bordered w-full"
        />
      </div>
      
      <ModelList
        models={openaiCompatibleModels}
        setModels={setOpenaiCompatibleModels}
        newModel={newModel}
        setNewModel={setNewModel}
        handleAddModel={handleAddModel}
        handleRemoveModel={handleRemoveModel}
        handleEditModel={handleEditModel}
      />
      
      {openaiCompatibleModels.length > 0 && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Current Model:</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={openaiCompatibleModelId}
            onChange={e => setOpenaiCompatibleModelId(e.target.value)}
          >
            <option value="">Select a model</option>
            {openaiCompatibleModels.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
