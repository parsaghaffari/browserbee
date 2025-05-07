import type { Page } from "playwright-crx";
import { ToolFactory } from "./types";

// Import all tools from their respective modules
import { 
  saveMemory, 
  lookupMemories, 
  getAllMemories, 
  deleteMemory, 
  clearAllMemories 
} from "./memoryTools";

import { 
  browserNavigate, 
  browserWaitForNavigation, 
  browserNavigateBack, 
  browserNavigateForward 
} from "./navigationTools";

import {
  browserGetActiveTab,
  browserNavigateTab,
  browserScreenshotTab
} from "./tabContextTools";

import { 
  browserClick, 
  browserType, 
  browserHandleDialog 
} from "./interactionTools";

import { 
  browserGetTitle, 
  browserSnapshotDom, 
  browserQuery, 
  browserAccessibleTree, 
  browserReadText, 
  browserScreenshot 
} from "./observationTools";

import { 
  browserMoveMouse, 
  browserClickXY, 
  browserDrag 
} from "./mouseTools";

import { 
  browserPressKey, 
  browserKeyboardType 
} from "./keyboardTools";

import { 
  browserTabList, 
  browserTabNew, 
  browserTabSelect, 
  browserTabClose 
} from "./tabTools";

// Export all tools
export {
  // Navigation tools
  browserNavigate,
  browserWaitForNavigation,
  browserNavigateBack,
  browserNavigateForward,
  
  // Tab context tools
  browserGetActiveTab,
  browserNavigateTab,
  browserScreenshotTab,
  
  // Interaction tools
  browserClick,
  browserType,
  browserHandleDialog,
  
  // Observation tools
  browserGetTitle,
  browserSnapshotDom,
  browserQuery,
  browserAccessibleTree,
  browserReadText,
  browserScreenshot,
  
  // Mouse tools
  browserMoveMouse,
  browserClickXY,
  browserDrag,
  
  // Keyboard tools
  browserPressKey,
  browserKeyboardType,
  
  // Tab tools
  browserTabList,
  browserTabNew,
  browserTabSelect,
  browserTabClose,
  
  // Memory tools
  saveMemory,
  lookupMemories,
  getAllMemories,
  deleteMemory,
  clearAllMemories
};

// Function to get all tools as an array
export function getAllTools(page: Page) {
  const tools = [
    // Navigation tools
    browserNavigate(page),
    browserWaitForNavigation(page),
    browserNavigateBack(page),
    browserNavigateForward(page),
    
    // Tab context tools
    browserGetActiveTab(page),
    browserNavigateTab(page),
    browserScreenshotTab(page),
    
    // Interaction tools
    browserClick(page),
    browserType(page),
    browserHandleDialog(page),
    
    // Observation tools
    browserGetTitle(page),
    browserSnapshotDom(page),
    browserQuery(page),
    browserAccessibleTree(page),
    browserReadText(page),
    browserScreenshot(page),
    
    // Mouse tools
    browserMoveMouse(page),
    browserClickXY(page),
    browserDrag(page),
    
    // Keyboard tools
    browserPressKey(page),
    browserKeyboardType(page),
    
    // Tab tools
    browserTabList(page),
    browserTabNew(page),
    browserTabSelect(page),
    browserTabClose(page),
    
    // Memory tools
    saveMemory(page),
    lookupMemories(page),
    getAllMemories(page),
    deleteMemory(page),
    clearAllMemories(page)
  ];
  
  return tools;
}
