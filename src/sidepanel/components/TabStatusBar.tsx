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
  
  return (
    <div className="text-sm mt-1 p-2 bg-base-300 rounded-md border border-base-content border-opacity-10 flex items-center">
      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
      <div className="flex-1">
        <span className="font-semibold">Controlling:</span> 
        <span className="font-light"> {tabTitle} (tab ID: {tabId})</span>
      </div>
    </div>
  );
};
