import React from 'react';
import { ProviderSelector } from './ProviderSelector';
import { ProviderSettings } from './ProviderSettings';
import { SaveButton } from './SaveButton';
import { Model } from './ModelList';
import { OllamaModel } from './OllamaModelList';

interface LLMProviderConfigProps {
  // Provider selection
  provider: string;
  setProvider: (provider: string) => void;
  
  // Anthropic settings
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  anthropicBaseUrl: string;
  setAnthropicBaseUrl: (url: string) => void;
  thinkingBudgetTokens: number;
  setThinkingBudgetTokens: (tokens: number) => void;
  
  // OpenAI settings
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  openaiBaseUrl: string;
  setOpenaiBaseUrl: (url: string) => void;
  
  // Gemini settings
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (url: string) => void;
  
  // Ollama settings
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
  
  // OpenAI-compatible settings
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
  
  // Save functionality
  isSaving: boolean;
  saveStatus: string;
  handleSave: () => void;
  
  // Model operations
  handleAddModel: () => void;
  handleRemoveModel: (id: string) => void;
  handleEditModel: (idx: number, field: string, value: any) => void;
}

export function LLMProviderConfig({
  // Provider selection
  provider,
  setProvider,
  
  // Anthropic settings
  anthropicApiKey,
  setAnthropicApiKey,
  anthropicBaseUrl,
  setAnthropicBaseUrl,
  thinkingBudgetTokens,
  setThinkingBudgetTokens,
  
  // OpenAI settings
  openaiApiKey,
  setOpenaiApiKey,
  openaiBaseUrl,
  setOpenaiBaseUrl,
  
  // Gemini settings
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl,
  
  // Ollama settings
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
  handleEditOllamaModel,
  
  // OpenAI-compatible settings
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
  
  // Save functionality
  isSaving,
  saveStatus,
  handleSave,
  
  // Model operations
  handleAddModel,
  handleRemoveModel,
  handleEditModel
}: LLMProviderConfigProps) {
  return (
    <div className="card bg-base-100 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title text-xl">LLM Provider Configuration</h2>
        <p className="mb-4">
          Configure your preferred LLM provider and API settings.
          Your API keys are stored securely in your browser's storage.
        </p>
        
        {/* Provider Selector */}
        <ProviderSelector provider={provider} setProvider={setProvider} />
        
        {/* Provider-specific Settings */}
        <ProviderSettings
          provider={provider}
          // Anthropic
          anthropicApiKey={anthropicApiKey}
          setAnthropicApiKey={setAnthropicApiKey}
          anthropicBaseUrl={anthropicBaseUrl}
          setAnthropicBaseUrl={setAnthropicBaseUrl}
          thinkingBudgetTokens={thinkingBudgetTokens}
          setThinkingBudgetTokens={setThinkingBudgetTokens}
          // OpenAI
          openaiApiKey={openaiApiKey}
          setOpenaiApiKey={setOpenaiApiKey}
          openaiBaseUrl={openaiBaseUrl}
          setOpenaiBaseUrl={setOpenaiBaseUrl}
          // Gemini
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          geminiBaseUrl={geminiBaseUrl}
          setGeminiBaseUrl={setGeminiBaseUrl}
          // Ollama
          ollamaApiKey={ollamaApiKey}
          setOllamaApiKey={setOllamaApiKey}
          ollamaBaseUrl={ollamaBaseUrl}
          setOllamaBaseUrl={setOllamaBaseUrl}
          ollamaModelId={ollamaModelId}
          setOllamaModelId={setOllamaModelId}
          ollamaCustomModels={ollamaCustomModels}
          setOllamaCustomModels={setOllamaCustomModels}
          newOllamaModel={newOllamaModel}
          setNewOllamaModel={setNewOllamaModel}
          handleAddOllamaModel={handleAddOllamaModel}
          handleRemoveOllamaModel={handleRemoveOllamaModel}
          handleEditOllamaModel={handleEditOllamaModel}
          // OpenAI-compatible
          openaiCompatibleApiKey={openaiCompatibleApiKey}
          setOpenaiCompatibleApiKey={setOpenaiCompatibleApiKey}
          openaiCompatibleBaseUrl={openaiCompatibleBaseUrl}
          setOpenaiCompatibleBaseUrl={setOpenaiCompatibleBaseUrl}
          openaiCompatibleModelId={openaiCompatibleModelId}
          setOpenaiCompatibleModelId={setOpenaiCompatibleModelId}
          openaiCompatibleModels={openaiCompatibleModels}
          setOpenaiCompatibleModels={setOpenaiCompatibleModels}
          newModel={newModel}
          setNewModel={setNewModel}
          handleAddModel={handleAddModel}
          handleRemoveModel={handleRemoveModel}
          handleEditModel={handleEditModel}
        />
        
        <SaveButton 
          isSaving={isSaving}
          saveStatus={saveStatus}
          handleSave={handleSave}
          isDisabled={
            (provider === 'anthropic' && !anthropicApiKey.trim()) ||
            (provider === 'openai' && !openaiApiKey.trim()) ||
            (provider === 'gemini' && !geminiApiKey.trim())
          }
        />
      </div>
    </div>
  );
}
