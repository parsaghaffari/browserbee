import { logWithTimestamp, handleError, sendUIMessage } from './utils';
import { getTabState, getWindowForTab, getAgentForWindow } from './tabManager';
import { executePrompt } from './agentController';
import { MemoryService, AgentMemory } from '../tracking/memoryService';
import { ExecutionCallbacks } from '../agent/ExecutionEngine';
import { normalizeDomain } from '../tracking/domainUtils';

// Function to directly save a memory from the reflection process
export async function saveReflectionMemory(content: string, domain: string, tabId: number): Promise<void> {
  try {
    // Normalize the domain to ensure consistency
    const normalizedDomain = normalizeDomain(domain);
    
    await processReflectionOutput(content, normalizedDomain, tabId);
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
    
    // Get the window ID for this tab
    const windowId = getWindowForTab(activeTabId);
    if (!windowId) {
      logWithTimestamp(`Cannot reflect: No window ID for tab ${activeTabId}`, 'warn');
      
      // Notify the UI
      sendUIMessage('updateOutput', {
        type: 'system',
        content: `❌ Cannot reflect: No window ID found for this tab.`
      }, activeTabId, windowId);
      
      return;
    }
    
    // Get the agent for this window
    const agent = getAgentForWindow(windowId);
    if (!agent) {
      logWithTimestamp(`Cannot reflect: No agent for window ${windowId}`, 'warn');
      
      // Notify the UI
      sendUIMessage('updateOutput', {
        type: 'system',
        content: `❌ Cannot reflect: No active agent session found.`
      }, activeTabId, windowId);
      
      return;
    }
    
    // Get the current URL to extract the domain
    let domain = "unknown";
    try {
      const tab = await chrome.tabs.get(activeTabId);
      if (tab.url) {
        const url = new URL(tab.url);
        // Normalize the domain to ensure consistency
        domain = normalizeDomain(url.hostname);
      }
    } catch (error) {
      handleError(error, 'getting tab URL for reflection');
    }
    
    // Notify the UI that reflection has started
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `🧠 Reflecting on this session to learn useful patterns for ${domain}...`
    }, activeTabId, windowId);
    
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
      
      Focus only on the most useful and reusable patterns. If multiple tasks were performed, create separate memory records for each distinct task. Only save memories that are new or significantly different from existing ones.
      
      NOTE: The domain will be normalized (e.g., "www.example.com" becomes "example.com") to ensure consistent memory retrieval regardless of whether the user includes "www." or not.
      
      IMPORTANT: Your response must be valid JSON or a code block containing valid JSON. Ensure your JSON:
      - Uses double quotes for keys and string values
      - Has proper commas between elements (no trailing commas)
      - Properly escapes special characters in strings
      - Has balanced braces and brackets
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
 * @param isCorrection Whether this is a correction attempt
 */
async function processReflectionOutput(output: string, domain: string, tabId: number, isCorrection: boolean = false): Promise<void> {
  try {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      logWithTimestamp(`IndexedDB is not available in this browser environment`, 'error');
      sendUIMessage('updateOutput', {
        type: 'system',
        content: `❌ Cannot save memories: IndexedDB is not available in this browser environment.`
      }, tabId);
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
          // If this is already a correction attempt, don't try again to avoid infinite loops
          if (isCorrection) {
            throw parseError;
          }
          
          // Otherwise, attempt correction
          logWithTimestamp(`JSON parsing error, attempting correction: ${parseError instanceof Error ? parseError.message : String(parseError)}`, 'warn');
          
          // Notify the UI that we're attempting correction
          sendUIMessage('updateOutput', {
            type: 'system',
            content: `⚠️ Memory format error detected. Asking agent to correct it...`
          }, tabId);
          
          // Attempt correction
          await correctReflectionJSON(cleanJsonStr, parseError as Error, domain, tabId);
          return;
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
        
        // Normalize the domain of the memory
        memory.domain = normalizeDomain(memory.domain);
        
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
        sendUIMessage('updateOutput', {
          type: 'system',
          content: `✅ Saved ${savedIds.length} memories for ${domain}. The agent will now remember how to perform these tasks on this website.`
        }, tabId);
      } else {
        sendUIMessage('updateOutput', {
          type: 'system',
          content: `⚠️ No valid memories were found in the reflection. Please try again.`
        }, tabId);
      }
    } else {
      // No JSON found
      sendUIMessage('updateOutput', {
        type: 'system',
        content: `❌ Could not extract a valid memory from the reflection. Please try again.`
      }, tabId);
    }
  } catch (error) {
    // JSON parsing error
    logWithTimestamp(`Error processing reflection: ${error instanceof Error ? error.message : String(error)}`, 'error');
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `❌ Error processing reflection: ${error instanceof Error ? error.message : String(error)}`
    }, tabId);
  }
}

/**
 * Function to handle JSON correction by prompting the agent to fix the malformed JSON
 * @param malformedJson The malformed JSON string that needs correction
 * @param error The error that occurred during parsing
 * @param domain The domain to associate with the memories
 * @param tabId The tab ID for sending UI messages
 */
async function correctReflectionJSON(malformedJson: string, error: Error, domain: string, tabId: number): Promise<void> {
  try {
    // Extract the relevant part of the error message
    const errorMessage = error.message;
    
    // Create a correction prompt
    const correctionPrompt = `
      I attempted to save a memory, but there was a JSON parsing error:
      
      ERROR: ${errorMessage}
      
      Here is the malformed JSON that needs to be fixed:
      \`\`\`
      ${malformedJson}
      \`\`\`
      
      Please correct the JSON and provide a valid version that follows this structure:
      {
        "domain": "${domain}",
        "taskDescription": "brief description of the task",
        "toolSequence": ["tool1 | input1", "tool2 | input2", ...]
      }
    `;
    
    // Notify the UI about the correction attempt
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `🔄 Attempting to correct JSON format error: ${errorMessage}`
    }, tabId);
    
    // Create a custom callback for handling the corrected JSON
    const correctionCallbacks: ExecutionCallbacks = {
      onLlmOutput: async (output: string) => {
        // Try to process the corrected output
        try {
          await processReflectionOutput(output, domain, tabId, true);
        } catch (correctionError) {
          // If correction still fails, give up
          logWithTimestamp(`Correction attempt failed: ${correctionError instanceof Error ? correctionError.message : String(correctionError)}`, 'error');
          
          sendUIMessage('updateOutput', {
            type: 'system',
            content: `❌ Error processing reflection: Even after correction attempt, JSON is still invalid. ${correctionError instanceof Error ? correctionError.message : String(correctionError)}`
          }, tabId);
        }
      },
      onToolOutput: (content) => {
        // Pass through tool outputs
        sendUIMessage('updateOutput', {
          type: 'system',
          content: content
        }, tabId);
      },
      onComplete: () => {
        // Nothing special needed on completion
      }
    };
    
    // Get the window ID for this tab
    const windowId = getWindowForTab(tabId);
    if (!windowId) {
      throw new Error(`No window ID found for tab ${tabId}`);
    }
    
    // Get the agent for this window
    const agent = getAgentForWindow(windowId);
    if (!agent) {
      throw new Error(`No agent found for window ${windowId}`);
    }
    
    // Execute the correction prompt
    // We're using a direct call to the agent's executePrompt method
    // This is a special case for correction, not a regular user prompt
    const { executePromptWithFallback } = await import('../agent/AgentCore');
    await executePromptWithFallback(agent, correctionPrompt, correctionCallbacks, []);
    
  } catch (correctionError) {
    logWithTimestamp(`Error during JSON correction: ${correctionError instanceof Error ? correctionError.message : String(correctionError)}`, 'error');
    
    // Notify the UI about the failed correction attempt
    sendUIMessage('updateOutput', {
      type: 'system',
      content: `❌ Failed to correct memory JSON: ${correctionError instanceof Error ? correctionError.message : String(correctionError)}`
    }, tabId);
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
