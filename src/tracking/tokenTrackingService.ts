import { MODEL_INFO } from "../models/models";

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
  
  // Subscribers for UI updates
  private subscribers: (() => void)[] = [];

  private constructor() {}

  public static getInstance(): TokenTrackingService {
    if (!TokenTrackingService.instance) {
      TokenTrackingService.instance = new TokenTrackingService();
    }
    return TokenTrackingService.instance;
  }

  public trackInputTokens(tokens: number): void {
    this.inputTokens += tokens;
    this.updateCost();
    this.notifySubscribers();
  }

  public trackOutputTokens(tokens: number): void {
    this.outputTokens += tokens;
    this.updateCost();
    this.notifySubscribers();
  }

  public getUsage(): TokenUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cost: this.cost
    };
  }

  public reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.cost = 0;
    this.notifySubscribers();
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private updateCost(): void {
    // Calculate cost based on price per million tokens
    const inputCost = (MODEL_INFO.inputPrice / 1_000_000) * this.inputTokens;
    const outputCost = (MODEL_INFO.outputPrice / 1_000_000) * this.outputTokens;
    this.cost = inputCost + outputCost;
  }

  private notifySubscribers(): void {
    // Send message to UI via Chrome runtime messaging
    try {
      const usage = this.getUsage();
      chrome.runtime.sendMessage({
        action: 'tokenUsageUpdated',
        content: usage
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
