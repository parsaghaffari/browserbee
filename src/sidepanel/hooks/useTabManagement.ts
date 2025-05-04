import { useState, useEffect } from 'react';

export const useTabManagement = () => {
  const [tabId, setTabId] = useState<number | null>(null);
  const [tabTitle, setTabTitle] = useState<string>('');

  // Get the current tab ID and title when the component mounts
  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        // Try to get the tab ID from the last focused window
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tabs && tabs[0] && tabs[0].id) {
          const activeTabId = tabs[0].id;
          const windowId = tabs[0].windowId;
          const activeTabTitle = tabs[0].title || 'Unknown Tab';
          
          setTabId(activeTabId);
          setTabTitle(activeTabTitle);
          console.log(`Using tab ID ${activeTabId} in window ${windowId} from last focused window`);
          console.log(`Tab title: ${activeTabTitle}`);
          
          // Initialize tab attachment early, including the window ID
          chrome.runtime.sendMessage({ 
            action: 'initializeTab', 
            tabId: activeTabId,
            windowId: windowId
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error initializing tab:', chrome.runtime.lastError);
            } else if (response && response.success) {
              console.log(`Tab ${activeTabId} in window ${windowId} initialized successfully`);
            }
          });
        }
      } catch (error) {
        console.error('Error getting current tab:', error);
      }
    };
    
    getCurrentTab();
  }, []);
  
  // Listen for tab updates to update the tab title in real-time
  useEffect(() => {
    if (!tabId) return;
    
    const handleTabUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // Only update if this is our tab and the title has changed
      if (updatedTabId === tabId && changeInfo.title) {
        console.log(`Tab ${updatedTabId} title updated to: ${changeInfo.title}`);
        setTabTitle(changeInfo.title);
      }
    };
    
    // Add listener for tab updates
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    
    // Clean up listener when component unmounts or tabId changes
    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [tabId]);
  
  // Listen for tab replacement events
  useEffect(() => {
    if (!tabId) return;
    
    const messageListener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      // Handle tab replacement
      if (message.action === 'tabReplaced' && message.oldTabId === tabId) {
        console.log(`Tab ${tabId} was replaced with new tab ${message.newTabId}`);
        
        // Update the tab ID and title
        setTabId(message.newTabId);
        setTabTitle(message.title || "New BrowserBee Tab");
        
        sendResponse({ received: true });
        return true;
      }
      
      return false;
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Clean up the listener when the component unmounts or tabId changes
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [tabId]);

  return {
    tabId,
    tabTitle,
    setTabTitle
  };
};
