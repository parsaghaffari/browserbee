import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';

interface TabStatusBarProps {
  tabId: number | null;
  tabTitle: string;
}

export const TabStatusBar: React.FC<TabStatusBarProps> = ({
  tabId,
  tabTitle
}) => {
  const [tabStatus, setTabStatus] = useState<'attached' | 'detached' | 'unknown'>('unknown');
  const [tabUrl, setTabUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Listen for tab status changes
  useEffect(() => {
    if (!tabId) return;
    
    const statusListener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      // Ignore messages from other extensions
      if (sender.id !== chrome.runtime.id) {
        return;
      }
      
      // Only process messages for our tab
      if (message.tabId !== tabId) {
        return;
      }
      
      // Update status based on message type
      if (message.action === 'tabStatusChanged' && message.status) {
        setTabStatus(message.status);
        sendResponse({ received: true });
      } else if (message.action === 'targetChanged' && message.url) {
        setTabUrl(message.url);
        sendResponse({ received: true });
      }
      
      return true;
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(statusListener);
    
    // Get initial tab URL
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting tab:', chrome.runtime.lastError);
        return;
      }
      
      if (tab && tab.url) {
        setTabUrl(tab.url);
      }
    });
    
    // Clean up the listener when the component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(statusListener);
    };
  }, [tabId]);
  
  if (!tabId) return null;
  
  const handleTabClick = () => {
    // Send message to background script to switch to this tab
    chrome.runtime.sendMessage({ 
      action: 'switchToTab', 
      tabId 
    });
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Show a message to the user
    chrome.runtime.sendMessage({
      action: 'updateOutput',
      content: {
        type: 'system',
        content: 'Refreshing connection to tab...'
      }
    });
    
    // Reload the page to reinitialize tab connection
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };
  
  return (
    <div className="text-sm bg-base-300 rounded-md px-2 py-1 border border-base-content border-opacity-10 flex items-center max-w-[200px]">
      <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
        tabStatus === 'attached' ? 'bg-green-500 animate-pulse' : 
        tabStatus === 'detached' ? 'bg-red-500' : 'bg-yellow-500'
      }`} title={
        tabStatus === 'attached' ? 'Connected' : 
        tabStatus === 'detached' ? 'Disconnected' : 'Unknown'
      }></div>
      <span 
        className="cursor-pointer hover:underline hover:text-primary truncate"
        onClick={handleTabClick}
        title={`${tabTitle}${tabUrl ? `\n${tabUrl}` : ''}`}
      > 
        {tabTitle}
      </span>
      
      {/* Only show refresh button when detached */}
      <div className="flex items-center">
        {tabStatus === 'detached' && (
          <button 
            className="ml-1 text-xs text-primary hover:text-primary-focus"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh connection"
          >
            <FontAwesomeIcon 
              icon={faRotateRight} 
              className={isRefreshing ? 'animate-spin' : ''} 
              size="xs"
            />
          </button>
        )}
      </div>
    </div>
  );
};
