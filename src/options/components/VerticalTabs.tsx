import React, { useState } from 'react';
import { GeneralTab } from './tabs/GeneralTab';
import { ProvidersTab } from './tabs/ProvidersTab';
import { MemoryTab } from './tabs/MemoryTab';
import { Model } from './ModelList';
import { OllamaModel } from './OllamaModelList';

interface VerticalTabsProps {
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
  
  // Pricing data
  getModelPricingData: () => any[];
}

export function VerticalTabs(props: VerticalTabsProps) {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: '🏠' },
    { id: 'providers', label: 'LLM Configuration', icon: '🤖' },
    { id: 'memory', label: 'Memory', icon: '🧠' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />;
      case 'providers':
        return (
          <ProvidersTab
            provider={props.provider}
            setProvider={props.setProvider}
            anthropicApiKey={props.anthropicApiKey}
            setAnthropicApiKey={props.setAnthropicApiKey}
            anthropicBaseUrl={props.anthropicBaseUrl}
            setAnthropicBaseUrl={props.setAnthropicBaseUrl}
            thinkingBudgetTokens={props.thinkingBudgetTokens}
            setThinkingBudgetTokens={props.setThinkingBudgetTokens}
            openaiApiKey={props.openaiApiKey}
            setOpenaiApiKey={props.setOpenaiApiKey}
            openaiBaseUrl={props.openaiBaseUrl}
            setOpenaiBaseUrl={props.setOpenaiBaseUrl}
            geminiApiKey={props.geminiApiKey}
            setGeminiApiKey={props.setGeminiApiKey}
            geminiBaseUrl={props.geminiBaseUrl}
            setGeminiBaseUrl={props.setGeminiBaseUrl}
            ollamaApiKey={props.ollamaApiKey}
            setOllamaApiKey={props.setOllamaApiKey}
            ollamaBaseUrl={props.ollamaBaseUrl}
            setOllamaBaseUrl={props.setOllamaBaseUrl}
            ollamaModelId={props.ollamaModelId}
            setOllamaModelId={props.setOllamaModelId}
            ollamaCustomModels={props.ollamaCustomModels}
            setOllamaCustomModels={props.setOllamaCustomModels}
            newOllamaModel={props.newOllamaModel}
            setNewOllamaModel={props.setNewOllamaModel}
            handleAddOllamaModel={props.handleAddOllamaModel}
            handleRemoveOllamaModel={props.handleRemoveOllamaModel}
            handleEditOllamaModel={props.handleEditOllamaModel}
            openaiCompatibleApiKey={props.openaiCompatibleApiKey}
            setOpenaiCompatibleApiKey={props.setOpenaiCompatibleApiKey}
            openaiCompatibleBaseUrl={props.openaiCompatibleBaseUrl}
            setOpenaiCompatibleBaseUrl={props.setOpenaiCompatibleBaseUrl}
            openaiCompatibleModelId={props.openaiCompatibleModelId}
            setOpenaiCompatibleModelId={props.setOpenaiCompatibleModelId}
            openaiCompatibleModels={props.openaiCompatibleModels}
            setOpenaiCompatibleModels={props.setOpenaiCompatibleModels}
            newModel={props.newModel}
            setNewModel={props.setNewModel}
            isSaving={props.isSaving}
            saveStatus={props.saveStatus}
            handleSave={props.handleSave}
            handleAddModel={props.handleAddModel}
            handleRemoveModel={props.handleRemoveModel}
            handleEditModel={props.handleEditModel}
            getModelPricingData={props.getModelPricingData}
          />
        );
      case 'memory':
        return <MemoryTab />;
      default:
        return <GeneralTab />;
    }
  };

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Left Sidebar - Vertical Tabs */}
      <div className="w-64 bg-base-100 shadow-lg">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-primary mb-6">BrowserBee 🐝</h1>
          <div className="tabs tabs-vertical w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab tab-lg justify-start gap-3 w-full ${
                  activeTab === tab.id ? 'tab-active' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 p-6 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}
