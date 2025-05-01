import type { Page } from "playwright-crx/test";
import { MemoryService, AgentMemory } from '../../tracking/memoryService';
import { logWithTimestamp } from '../../background/utils';
import { normalizeDomain } from '../../tracking/domainUtils';

export function saveMemory(page: Page) {
  return {
    name: "save_memory",
    description: "Save a memory of how to accomplish a specific task on a website. Use this when you want to remember a useful sequence of actions for future reference.",
    func: async (input: string): Promise<string> => {
      try {
        const inputObj = JSON.parse(input);
        let { domain, taskDescription, toolSequence } = inputObj;
        
        if (!domain || !taskDescription || !toolSequence) {
          return "Error: Missing required fields. Please provide domain, taskDescription, and toolSequence.";
        }
        
        // Normalize the domain
        domain = normalizeDomain(domain);
        
        if (!domain) {
          return "Error: Invalid domain provided.";
        }
        
        const memory: AgentMemory = {
          domain,
          taskDescription,
          toolSequence,
          createdAt: Date.now()
        };
        
        const memoryService = MemoryService.getInstance();
        const id = await memoryService.storeMemory(memory);
        
        return `Memory saved successfully with ID: ${id}`;
      } catch (error) {
        logWithTimestamp(`Error saving memory: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return `Error saving memory: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}

export function lookupMemories(page: Page) {
  return {
    name: "lookup_memories",
    description: "Look up stored memories for a specific website domain. Use this as your FIRST step when starting a task on a website to check if there are any saved patterns you can reuse. Always call this with the current domain (e.g., 'www.google.com').",
    func: async (input: string): Promise<string> => {
      try {
        // Extract and normalize domain from input
        let domain = input.trim();
        
        // Normalize the domain using the utility function
        domain = normalizeDomain(domain);
        
        if (!domain) {
          return "Error: Please provide a valid domain to lookup memories for.";
        }
        
        const memoryService = MemoryService.getInstance();
        const memories = await memoryService.getMemoriesByDomain(domain);
        
        if (memories.length === 0) {
          return `No memories found for domain: ${domain}`;
        }
        
        // Sort memories by creation date (newest first)
        memories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        // Format the memories in a more concise way
        const formattedMemories = memories.map(memory => ({
          domain: memory.domain,
          taskDescription: memory.taskDescription,
          toolSequence: memory.toolSequence,
          createdAt: memory.createdAt ? new Date(memory.createdAt).toISOString() : 'unknown'
        }));
        
        return JSON.stringify(formattedMemories, null, 2);
      } catch (error) {
        logWithTimestamp(`Error looking up memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return `Error looking up memories: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}

export function getAllMemories(page: Page) {
  return {
    name: "get_all_memories",
    description: "Retrieve all stored memories across all domains. Use this when you want to see all available memories.",
    func: async (): Promise<string> => {
      try {
        const memoryService = MemoryService.getInstance();
        const memories = await memoryService.getAllMemories();
        
        if (memories.length === 0) {
          return "No memories found.";
        }
        
        return JSON.stringify(memories, null, 2);
      } catch (error) {
        logWithTimestamp(`Error retrieving all memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return `Error retrieving all memories: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}

export function deleteMemory(page: Page) {
  return {
    name: "delete_memory",
    description: "Delete a specific memory by its ID. Use this when a memory is no longer useful or accurate.",
    func: async (input: string): Promise<string> => {
      try {
        const id = parseInt(input.trim(), 10);
        
        if (isNaN(id)) {
          return "Error: Please provide a valid numeric ID.";
        }
        
        const memoryService = MemoryService.getInstance();
        await memoryService.deleteMemory(id);
        
        return `Memory with ID ${id} deleted successfully.`;
      } catch (error) {
        logWithTimestamp(`Error deleting memory: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return `Error deleting memory: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}

export function clearAllMemories(page: Page) {
  return {
    name: "clear_all_memories",
    description: "Clear all stored memories. Use this with caution as it will delete all memories across all domains.",
    func: async (): Promise<string> => {
      try {
        const memoryService = MemoryService.getInstance();
        await memoryService.clearMemories();
        
        return "All memories cleared successfully.";
      } catch (error) {
        logWithTimestamp(`Error clearing memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return `Error clearing memories: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}
