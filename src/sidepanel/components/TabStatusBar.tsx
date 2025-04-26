import React from 'react';

interface TabStatusBarProps {
  tabId: number | null;
  tabTitle: string;
}

export const TabStatusBar: React.FC<TabStatusBarProps> = ({
  tabId,
  tabTitle
}) => {
  if (!tabId) return null;
  
  const handleTabClick = () => {
    // Send message to background script to switch to this tab
    chrome.runtime.sendMessage({ 
      action: 'switchToTab', 
      tabId 
    });
  };
  
  return (
    <div className="text-sm bg-base-300 rounded-md px-2 py-1 border border-base-content border-opacity-10 flex items-center max-w-[200px]">
      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse flex-shrink-0"></div>
      <span 
        className="cursor-pointer hover:underline hover:text-primary truncate"
        onClick={handleTabClick}
        title={tabTitle}
      > 
        {tabTitle}
      </span>
    </div>
  );
};
