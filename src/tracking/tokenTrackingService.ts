import { anthropicModels, openaiModels, geminiModels, ollamaModels } from "../models/models";
import { ConfigManager } from "../background/configManager";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export class TokenTrackingService {
  private static instance: TokenTrackingService;
  
  // In-memory storage (no persistence)
  private inputTokens: number = 0;
  private outputTokens: number = 0;
  private cost: number = 0;
  
  // Provider and model tracking
  private configManager: ConfigManager;
  private currentProvider: string = 'anthropic';
  private currentModelId: string = '';
  
  // Subscribers for UI updates
  private subscribers: (() => void)[] = [];

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.initializeProviderConfig();
  }

  public static getInstance(): TokenTrackingService {
    if (!TokenTrackingService.instance) {
      TokenTrackingService.instance = new TokenTrackingService();
    }
    return TokenTrackingService.instance;
  }

  private async initializeProviderConfig() {
    try {
      const config = await this.configManager.getProviderConfig();
      this.currentProvider = config.provider;
      this.currentModelId = config.apiModelId || '';
      this.updateCost(); // Recalculate with new provider/model
    } catch (error) {
      console.error('Failed to get provider config:', error);
    }
  }

  public trackInputTokens(tokens: number, cacheTokens?: { write?: number, read?: number }, windowId?: number): void {
    this.inputTokens += tokens;
    
    // Add cache tokens to the total if provided
    if (cacheTokens) {
      if (cacheTokens.write) this.inputTokens += cacheTokens.write;
      if (cacheTokens.read) this.inputTokens += cacheTokens.read;
    }
    
    this.updateCost();
    this.notifySubscribers(windowId);
  }

  public trackOutputTokens(tokens: number, windowId?: number): void {
    this.outputTokens += tokens;
    this.updateCost();
    this.notifySubscribers(windowId);
  }

  public getUsage(): TokenUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cost: this.cost
    };
  }

  public reset(windowId?: number): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.cost = 0;
    this.notifySubscribers(windowId);
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Update provider and model information
  public updateProviderAndModel(provider: string, modelId: string, windowId?: number): void {
    this.currentProvider = provider;
    this.currentModelId = modelId;
    this.updateCost();
    this.notifySubscribers(windowId);
  }

  private updateCost(): void {
    let inputPrice = 0;
    let outputPrice = 0;
    
    // Get pricing based on current provider and model
    switch (this.currentProvider) {
      case 'anthropic':
        if (this.currentModelId && this.currentModelId in anthropicModels) {
          const model = anthropicModels[this.currentModelId as keyof typeof anthropicModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
      case 'openai':
        if (this.currentModelId && this.currentModelId in openaiModels) {
          const model = openaiModels[this.currentModelId as keyof typeof openaiModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
      case 'gemini':
        if (this.currentModelId && this.currentModelId in geminiModels) {
          const model = geminiModels[this.currentModelId as keyof typeof geminiModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
      case 'ollama':
        if (this.currentModelId && this.currentModelId in ollamaModels) {
          const model = ollamaModels[this.currentModelId as keyof typeof ollamaModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
    }
    
    // Calculate cost based on price per million tokens
    const inputCost = (inputPrice / 1_000_000) * this.inputTokens;
    const outputCost = (outputPrice / 1_000_000) * this.outputTokens;
    this.cost = inputCost + outputCost;
  }

  private notifySubscribers(windowId?: number): void {
    // Send message to UI via Chrome runtime messaging
    try {
      const usage = this.getUsage();
      
      // Get the current tab ID and window ID if possible
      chrome.tabs.query({ active: true, lastFocusedWindow: true })
        .then(tabs => {
          const tabId = tabs[0]?.id;
          const currentWindowId = tabs[0]?.windowId || windowId;
          
          chrome.runtime.sendMessage({
            action: 'tokenUsageUpdated',
            content: usage,
            tabId,
            windowId: currentWindowId
          });
        })
        .catch(error => {
          // If we can't get the current tab, just send the message without tab/window ID
          chrome.runtime.sendMessage({
            action: 'tokenUsageUpdated',
            content: usage
          });
        });
    } catch (error) {
      console.error('Error sending token usage update:', error);
    }
    
    // Also notify local subscribers
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }
}
