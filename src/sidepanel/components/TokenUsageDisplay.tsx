import React, { useEffect, useState } from 'react';
import { TokenTrackingService, TokenUsage } from '../../tracking/tokenTrackingService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';

export function TokenUsageDisplay() {
  const [usage, setUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, cost: 0 });
  
  useEffect(() => {
    // Get initial usage from local instance
    const tokenTracker = TokenTrackingService.getInstance();
    const initialUsage = tokenTracker.getUsage();
    setUsage(initialUsage);
    
    // Subscribe to local updates
    const unsubscribe = tokenTracker.subscribe(() => {
      const updatedUsage = tokenTracker.getUsage();
      setUsage(updatedUsage);
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
  
  return (
    <div className="card bg-base-100 shadow-sm p-3 mt-2 text-xs">
      <div className="flex justify-between items-center">
        <span className="font-medium">Token Usage:</span>
        <span><FontAwesomeIcon icon={faArrowUp} /> {usage.inputTokens} <FontAwesomeIcon icon={faArrowDown} /> {usage.outputTokens}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="font-medium">Estimated Cost:</span>
        <span>${usage.cost.toFixed(6)}</span>
      </div>
    </div>
  );
}
