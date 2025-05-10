import React, { useEffect, useState } from 'react';
import { ConfigManager } from '../../background/configManager';
import { TokenTrackingService } from '../../tracking/tokenTrackingService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faCircleInfo } from '@fortawesome/free-solid-svg-icons';

interface ProviderOption {
  provider: string;
  displayName: string;
  models: {id: string, name: string}[];
}

interface ProviderSelectorProps {
  isProcessing: boolean;
}

export function ProviderSelector({ isProcessing }: ProviderSelectorProps) {
  const [options, setOptions] = useState<ProviderOption[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to load provider options
  const loadOptions = async () => {
    setIsLoading(true);
    const configManager = ConfigManager.getInstance();
    
    // Get current config
    const config = await configManager.getProviderConfig();
    setCurrentProvider(config.provider);
    setCurrentModel(config.apiModelId || '');
    
    // Get configured providers
    const providers = await configManager.getConfiguredProviders();
    
    // Build options
    const providerOptions: ProviderOption[] = [];
    
    for (const provider of providers) {
      const models = await configManager.getModelsForProvider(provider);
      
      providerOptions.push({
        provider,
        displayName: formatProviderName(provider),
        models,
      });
    }
    
    setOptions(providerOptions);
    setIsLoading(false);
  };
  
  // Load options when component mounts
  useEffect(() => {
    loadOptions();
  }, []);
  
  // Listen for provider configuration changes
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === 'providerConfigChanged') {
        console.log('Provider configuration changed, refreshing options');
        loadOptions();
      }
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Clean up the listener when the component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);
  
  const formatProviderName = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Anthropic';
      case 'openai': return 'OpenAI';
      case 'gemini': return 'Google';
      case 'ollama': return 'Ollama';
      default: return provider;
    }
  };
  
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [provider, modelId] = value.split('|');
    
    if (provider && modelId) {
      setCurrentProvider(provider);
      setCurrentModel(modelId);
      
      // Update config
      const configManager = ConfigManager.getInstance();
      await configManager.updateProviderAndModel(provider, modelId);
      
      // Update token tracking service with new provider and model
      const tokenTracker = TokenTrackingService.getInstance();
      tokenTracker.updateProviderAndModel(provider, modelId);
      
      // Clear message history to ensure a clean state with the new provider
      try {
        await chrome.runtime.sendMessage({
          action: 'clearHistory'
        });
        
        // Show a message to the user
        chrome.runtime.sendMessage({
          action: 'updateOutput',
          content: {
            type: 'system',
            content: `Switched to ${formatProviderName(provider)} model: ${modelId}`
          }
        });
      } catch (error) {
        console.error('Error clearing history:', error);
      }
      
      // Reload the page to apply changes
      window.location.reload();
    }
  };
  
  if (isLoading || options.length === 0) {
    return null;
  }
  
  // Function to open options page in a new tab
  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };
  
  // Function to open help documentation
  const openHelpPage = () => {
    window.open('https://parsaghaffari.github.io/browserbee/', '_blank');
  };

  return (
    <div className="flex items-center justify-between mb-2 px-0">
      <div className="flex items-center">
        <button 
          className="btn btn-ghost btn-xs p-1" 
          onClick={openOptionsPage}
          title="Open Settings"
          disabled={isProcessing}
        >
          <FontAwesomeIcon icon={faCog} className="text-gray-500 hover:text-gray-700" />
        </button>
        <select 
          className="select select-ghost select-xs select-bordered w-auto focus:outline-none focus:ring-0 pl-0"
          value={`${currentProvider}|${currentModel}`}
          onChange={handleChange}
          disabled={isProcessing}
        >
          {options.map(option => (
            option.models.map(model => (
              <option 
                key={`${option.provider}|${model.id}`} 
                value={`${option.provider}|${model.id}`}
              >
                {option.displayName} - {model.name}
              </option>
            ))
          ))}
        </select>
      </div>
      <button 
        className="btn btn-ghost btn-xs p-1" 
        onClick={openHelpPage}
        title="Open Help"
        disabled={isProcessing}
      >
        <FontAwesomeIcon icon={faCircleInfo} className="text-gray-500 hover:text-gray-700" />
      </button>
    </div>
  );
}
