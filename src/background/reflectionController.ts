import { logWithTimestamp, handleError, sendUIMessage } from './utils';
import { getTabState } from './tabManager';
import { executePrompt } from './agentController';
import { MemoryService, AgentMemory } from '../tracking/memoryService';
import { ExecutionCallbacks } from '../agent/ExecutionEngine';

// Function to directly save a memory from the reflection process
export async function saveReflectionMemory(content: string, domain: string, tabId: number): Promise<void> {
  try {
    await processReflectionOutput(content, domain, tabId);
    // No UI message here - processReflectionOutput will handle notifications
  } catch (error) {
    // Send an error notification to the UI
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `❌ Error saving memory: ${error instanceof Error ? error.message : String(error)}`
    }, tabId);
  }
}

/**
 * Trigger the reflection process for a specific tab
 * @param tabId The ID of the tab to reflect on, or undefined to use the active tab
 */
export async function triggerReflection(tabId?: number): Promise<void> {
  try {
    // Get the active tab ID if not provided
    let activeTabId = tabId;
    if (!activeTabId) {
      try {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        activeTabId = tabs[0]?.id;
        if (!activeTabId) {
          throw new Error('No active tab found');
        }
      } catch (error) {
        logWithTimestamp(`Error getting active tab: ${error instanceof Error ? error.message : String(error)}`, 'error');
        throw error;
      }
    }
    const tabState = getTabState(activeTabId);
    
    if (!tabState || !tabState.agent) {
      logWithTimestamp(`Cannot reflect: No agent for tab ${activeTabId}`, 'warn');
      
      // Notify the UI
      chrome.runtime.sendMessage({
        action: 'updateOutput',
        content: {
          type: 'system',
          content: `❌ Cannot reflect: No active agent session found.`
        },
        tabId: activeTabId
      });
      
      return;
    }
    
    // Get the current URL to extract the domain
    let domain = "unknown";
    try {
      const tab = await chrome.tabs.get(activeTabId);
      if (tab.url) {
        const url = new URL(tab.url);
        domain = url.hostname;
      }
    } catch (error) {
      handleError(error, 'getting tab URL for reflection');
    }
    
    // Notify the UI that reflection has started
    chrome.runtime.sendMessage({
      action: 'updateOutput',
      content: {
        type: 'system',
        content: `🧠 Reflecting on this session to learn useful patterns for ${domain}...`
      },
      tabId: activeTabId
    });
    
    // Create a reflection prompt
    const reflectionPrompt = `
      Please analyze the conversation history and identify useful patterns for accomplishing tasks on ${domain}.
      
      Create a structured memory record with:
      1. A short description of the task that was accomplished
      2. The optimal sequence of tools that were used to solve it
      
      Format your response as a valid JSON object with these fields:
      {
        "domain": "${domain}",
        "taskDescription": "brief description of the task",
        "toolSequence": ["tool1 | input1", "tool2 | input2", ...]
      }
      
      Focus only on the most useful and reusable patterns. If multiple tasks were performed, create separate memory records for each distinct task.
      
      IMPORTANT: Your response must be valid JSON or a code block containing valid JSON.
    `;
    
    // Execute the reflection prompt with callbacks, marking it as a reflection prompt
    executePrompt(reflectionPrompt, activeTabId, true);
  } catch (error) {
    logWithTimestamp(`Error during reflection: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
}

/**
 * Process the reflection output to extract and save memories
 * @param output The LLM output to process
 * @param domain The domain to associate with the memories
 * @param tabId The tab ID for sending UI messages
 */
async function processReflectionOutput(output: string, domain: string, tabId: number): Promise<void> {
  try {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      logWithTimestamp(`IndexedDB is not available in this browser environment`, 'error');
      chrome.runtime.sendMessage({
        action: 'updateOutput',
        content: {
          type: 'system',
          content: `❌ Cannot save memories: IndexedDB is not available in this browser environment.`
        },
        tabId: tabId
      });
      return;
    }
    
    // Look for JSON in the output
    const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/) || 
                      output.match(/```\n([\s\S]*?)\n```/) ||
                      output.match(/{[\s\S]*?}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const cleanJsonStr = jsonStr.trim();
      
      // Try to parse the JSON
      let memories: AgentMemory[] = [];
      try {
        const parsed = JSON.parse(cleanJsonStr);
        
        // Check if it's a single memory or an array of memories
        if (Array.isArray(parsed)) {
          memories = parsed;
        } else {
          memories = [parsed];
        }
      } catch (parseError) {
        // If parsing fails, try to extract JSON objects from the string
        const jsonObjects = extractJsonObjects(cleanJsonStr);
        if (jsonObjects.length > 0) {
          memories = jsonObjects;
        } else {
          throw parseError;
        }
      }
      
      // Initialize the memory service
      const memoryService = MemoryService.getInstance();
      await memoryService.init();
      
      // Save each memory
      const savedIds: number[] = [];
      for (const memory of memories) {
        // Validate the memory
        if (!memory.domain || !memory.taskDescription || !memory.toolSequence) {
          logWithTimestamp(`Invalid memory: missing required fields`, 'warn');
          continue;
        }
        
        // Save the memory
        try {
          const id = await memoryService.storeMemory(memory);
          savedIds.push(id);
        } catch (storeError) {
          logWithTimestamp(`Error storing memory: ${storeError instanceof Error ? storeError.message : String(storeError)}`, 'error');
        }
      }
      
      // Notify the UI
      if (savedIds.length > 0) {
        chrome.runtime.sendMessage({
          action: 'updateOutput',
          content: {
            type: 'system',
            content: `✅ Saved ${savedIds.length} memories for ${domain}. The agent will now remember how to perform these tasks on this website.`
          },
          tabId: tabId
        });
      } else {
        chrome.runtime.sendMessage({
          action: 'updateOutput',
          content: {
            type: 'system',
            content: `⚠️ No valid memories were found in the reflection. Please try again.`
          },
          tabId: tabId
        });
      }
    } else {
      // No JSON found
      chrome.runtime.sendMessage({
        action: 'updateOutput',
        content: {
          type: 'system',
          content: `❌ Could not extract a valid memory from the reflection. Please try again.`
        },
        tabId: tabId
      });
    }
  } catch (error) {
    // JSON parsing error
    logWithTimestamp(`Error processing reflection: ${error instanceof Error ? error.message : String(error)}`, 'error');
    chrome.runtime.sendMessage({
      action: 'updateOutput',
      content: {
        type: 'system',
        content: `❌ Error processing reflection: ${error instanceof Error ? error.message : String(error)}`
      },
      tabId: tabId
    });
  }
}

/**
 * Helper function to extract JSON objects from a string
 * @param str The string to extract JSON objects from
 * @returns An array of parsed JSON objects
 */
function extractJsonObjects(str: string): any[] {
  const objects: any[] = [];
  let depth = 0;
  let start = -1;
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{') {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const jsonStr = str.substring(start, i + 1);
          const obj = JSON.parse(jsonStr);
          objects.push(obj);
        } catch (e) {
          // Ignore invalid JSON
        }
        start = -1;
      }
    }
  }
  
  return objects;
}
