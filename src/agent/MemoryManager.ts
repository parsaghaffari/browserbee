import Anthropic from "@anthropic-ai/sdk";
import { BrowserTool } from "./tools/types";

/**
 * MemoryManager handles memory lookup and integration.
 */
export class MemoryManager {
  private memoryTool: BrowserTool | undefined;
  
  constructor(tools: BrowserTool[]) {
    // Find the memory lookup tool
    this.memoryTool = tools.find(t => t.name === "lookup_memories");
  }
  
  /**
   * Look up memories for a domain and add them to the message history
   * @param domain The domain to look up memories for
   * @param messages The messages array to add memories to
   */
  async lookupMemories(domain: string, messages: Anthropic.MessageParam[]): Promise<void> {
    try {
      // Look up memories for this domain
      if (this.memoryTool) {
        const memoryResult = await this.memoryTool.func(domain);
        
        // If we found memories, add them to the context
        if (memoryResult && !memoryResult.startsWith("No memories found")) {
          try {
            const memories = JSON.parse(memoryResult);
            
            if (memories.length > 0) {
              // Add a system message about the memories
              const memoryContext = `I found ${memories.length} memories for ${domain}. Here are patterns that worked before:\n\n` +
                memories.map((m: any) => 
                  `Task: ${m.taskDescription}\nSteps: ${m.toolSequence.join(" → ")}`
                ).join("\n\n");
              
              // Add to messages
              messages.push({ 
                role: "user", 
                content: `Before we start, here are some patterns that worked well for tasks on this website before:\n\n${memoryContext}\n\nYou can adapt these patterns to the current task if relevant.` 
              });
            }
          } catch (error) {
            console.warn(`Error parsing memory results: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Error looking up memories: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update the memory tool
   */
  updateMemoryTool(tools: BrowserTool[]): void {
    this.memoryTool = tools.find(t => t.name === "lookup_memories");
  }
}
