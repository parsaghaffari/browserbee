import React, { useEffect, useState } from 'react';
import { TokenTrackingService, TokenUsage } from '../../tracking/tokenTrackingService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faRobot } from '@fortawesome/free-solid-svg-icons';
import { ConfigManager, ProviderConfig } from '../../background/configManager';

// Helper function to format token counts
const formatTokenCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  }
  return (count / 1000).toFixed(1) + 'k';
};

export function TokenUsageDisplay() {
  const [usage, setUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, cost: 0 });
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  
  useEffect(() => {
    // Get instances
    const tokenTracker = TokenTrackingService.getInstance();
    const configManager = ConfigManager.getInstance();
    
    // Get initial usage
    const initialUsage = tokenTracker.getUsage();
    setUsage(initialUsage);
    
    // Subscribe to local updates
    const unsubscribe = tokenTracker.subscribe(() => {
      const updatedUsage = tokenTracker.getUsage();
      setUsage(updatedUsage);
    });
    
    // Get provider configuration and update token tracker
    configManager.getProviderConfig().then(config => {
      setProviderConfig(config);
      // Update token tracker with current provider and model
      tokenTracker.updateProviderAndModel(config.provider, config.apiModelId || '');
    });
    
    // Listen for messages from the background script
    const messageListener = (message: any) => {
      if (message.action === 'tokenUsageUpdated' && message.content) {
        setUsage(message.content);
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Request current usage from background script
    chrome.runtime.sendMessage({ action: 'getTokenUsage' });
    
    return () => {
      unsubscribe();
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);
  
  const totalTokens = usage.inputTokens + usage.outputTokens;
  
  // Format provider name for display
  const formatProviderName = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Anthropic';
      case 'openai': return 'OpenAI';
      case 'gemini': return 'Google';
      case 'ollama': return 'Ollama';
      default: return provider;
    }
  };
  
  // Format model name for display
  const formatModelName = (modelId: string) => {
    // Extract the model name from the model ID
    if (modelId.includes('claude')) {
      // For Claude models, extract the version and variant
      const match = modelId.match(/claude-(\d+\.\d+)-(\w+)/);
      if (match) {
        return `Claude ${match[1]} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`;
      }
      return modelId;
    } else if (modelId.includes('gpt')) {
      // For GPT models, capitalize and format
      return modelId.toUpperCase().replace(/-/g, ' ');
    } else if (modelId.includes('gemini')) {
      // For Gemini models, capitalize and format
      const parts = modelId.split('-');
      return `Gemini ${parts[1]} ${parts[2].charAt(0).toUpperCase() + parts[2].slice(1)}`;
    } else if (modelId.includes('llama')) {
      // For Llama models, capitalize and format
      return `Llama ${modelId.replace('llama', '')}`;
    } else if (modelId.includes('Qwen')) {
      // For Qwen models, format nicely
      return modelId.replace('-Instruct', '');
    }
    return modelId;
  };
  
  return (
    <div className="card bg-base-100 shadow-sm p-3 mt-2 text-xs">
      <div className="flex justify-between items-center">
        <span className="font-medium">Token Usage:</span>
        <span><FontAwesomeIcon icon={faArrowUp} /> {formatTokenCount(usage.inputTokens)} <FontAwesomeIcon icon={faArrowDown} /> {formatTokenCount(usage.outputTokens)}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="font-medium">Estimated Cost:</span>
        <span>${usage.cost.toFixed(6)}</span>
      </div>
    </div>
  );
}
