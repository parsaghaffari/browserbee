import React from 'react';
import { AnthropicSettings } from './AnthropicSettings';
import { OpenAISettings } from './OpenAISettings';
import { GeminiSettings } from './GeminiSettings';
import { OllamaSettings } from './OllamaSettings';
import { OpenAICompatibleSettings } from './OpenAICompatibleSettings';
import { Model } from './ModelList';
import { OllamaModel } from './OllamaModelList';

interface ProviderSettingsProps {
  provider: string;
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
  handleAddModel: () => void;
  handleRemoveModel: (id: string) => void;
  handleEditModel: (idx: number, field: string, value: any) => void;
}

export function ProviderSettings({
  provider,
  // Anthropic
  anthropicApiKey,
  setAnthropicApiKey,
  anthropicBaseUrl,
  setAnthropicBaseUrl,
  thinkingBudgetTokens,
  setThinkingBudgetTokens,
  // OpenAI
  openaiApiKey,
  setOpenaiApiKey,
  openaiBaseUrl,
  setOpenaiBaseUrl,
  // Gemini
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl,
  // Ollama
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
  // OpenAI-compatible
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
}: ProviderSettingsProps) {
  return (
    <>
      {provider === 'anthropic' && (
        <AnthropicSettings 
          anthropicApiKey={anthropicApiKey}
          setAnthropicApiKey={setAnthropicApiKey}
          anthropicBaseUrl={anthropicBaseUrl}
          setAnthropicBaseUrl={setAnthropicBaseUrl}
          thinkingBudgetTokens={thinkingBudgetTokens}
          setThinkingBudgetTokens={setThinkingBudgetTokens}
        />
      )}
      
      {provider === 'openai' && (
        <OpenAISettings 
          openaiApiKey={openaiApiKey}
          setOpenaiApiKey={setOpenaiApiKey}
          openaiBaseUrl={openaiBaseUrl}
          setOpenaiBaseUrl={setOpenaiBaseUrl}
        />
      )}
      
      {provider === 'gemini' && (
        <GeminiSettings 
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          geminiBaseUrl={geminiBaseUrl}
          setGeminiBaseUrl={setGeminiBaseUrl}
        />
      )}
      
      {provider === 'ollama' && (
        <OllamaSettings 
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
        />
      )}
      
      {provider === 'openai-compatible' && (
        <OpenAICompatibleSettings 
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
      )}
    </>
  );
}
