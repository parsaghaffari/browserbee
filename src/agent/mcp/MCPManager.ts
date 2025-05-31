import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import pkg from "../../../package.json";
import { TabState } from "../../background/types";
import { JSONRPCMessage } from "../a2a/schema";
import { BrowserTool } from "../tools/types";
import MCPClientTransport, { MCPClientTransportSourceId } from "./MCPClientTransport";

export interface MCPMessageFromContentScript extends JSONRPCMessage {
  mcpSessionId: string;
  method?: string;
  tabId: number;
  senderId?: string;
  source: string;
}

/** MCP Manager for the background script & tab */
export class MCPManager {
  private onToolsReceived?: (tools: BrowserTool[]) => void;
  private tabId: number;
  private clientsBySession: Record<string, Client> = {};

  constructor(tabState: TabState) {
    this.tabId = tabState.tabId!;

    // sender.id is the extension ID, sender.origin = chrome-extension://{extensionId}, sender.url = {origin}/src/sidepanel.html
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    chrome.runtime.onMessageExternal.addListener((message, sender) => {
      if (message.method !== "mcp:ping") {
        console.debug('MCPManager received external message', message, sender);
      }
      message.senderId = sender.id;
      this.handleMessage(message);
    });
  }

  // AgentCore/BrowserAgent requests tools from MCP servers
  requestToolsForAgent(onToolsReceived: (tools: BrowserTool[]) => void) {
    console.debug('MCPManager.requestToolsForAgent', this.tabId, new Date().getTime());

    this.onToolsReceived = onToolsReceived;

    console.debug('MCPManager.requestToolsForAgent sending mcp:activate message to tabId:', this.tabId);
    chrome.tabs.sendMessage(this.tabId, {
      action: 'mcp:activate',
      tabId: this.tabId,
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('MCPManager could not send message to content script:', chrome.runtime.lastError.message);
      }
    });
  }

  private handleMessage(message: any) {
    const { method } = message;
    if (method?.startsWith('mcp:')) {
      this.handleMCPMessage(method.slice(4), message);
    }
  }

  private handleMCPMessage(method: string, message: Record<string, any>) {
    if (method === 'ping') {
      this.handlePing(message as MCPMessageFromContentScript);
    } else {
      console.debug('MCPManager.handleMCPMessage received MCP message', method, message);
    }
  }

  private handlePing(message: MCPMessageFromContentScript) {
    const { mcpSessionId: sessionId, tabId, senderId } = message;
    if (sessionId in this.clientsBySession === false) {
      console.debug('MCPManager.handlePing creating new MCP client for session:', sessionId, tabId, senderId);
      const transport = new MCPClientTransport(sessionId, tabId, senderId);
      const client = new Client(
        {
          name: pkg.name,
          version: pkg.version
        }
      );

      this.clientsBySession[sessionId] = client;

      client.connect(transport).then(() => this.fetchToolsFromMCP(client));
    }
  }

  private async fetchToolsFromMCP(client: Client) {
    const { tools } = await client.listTools();
    console.debug('MCPManager.fetchToolsFromMCP received tools', tools);
    const browserTools = tools.map<BrowserTool>(tool => {
      const { $schema, ...schema } = tool.inputSchema;
      return {
        name: tool.name,
        description: tool.description || JSON.stringify(schema),
        func: async (input: string) => {
          const args = input ? JSON.parse(input) : undefined;
          const toolResult = await client.callTool({ name: tool.name, arguments: args });
          console.info('MCP tool call result:', toolResult);
          return (typeof toolResult === 'string') ? toolResult : JSON.stringify(toolResult);
        }
      }
    });

    this.onToolsReceived?.(browserTools);
  }
}

/** MCP Manager for content script */
export class MCPContentManager {
  private active = false;
  private tabId: number = 0;

  listenFromContentScript() {
    chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if ('action' in message) {
        this.handleActionMessage(message);
      } else {
        this.handleMCPMessageFromBackground(message);
      }
      // return true;  // true or Promise if using sendResponse()
    });
  }

  private handleActionMessage(message: { action: string, tabId: number }) {
    switch (message.action) {
      case 'mcp:activate':
        if (!this.active) {
          this.active = true;
          this.tabId = message.tabId;
          window.addEventListener('message', this.handleMessageFromWindow.bind(this));
        }
    }
  }

  private handleMessageFromWindow(event: MessageEvent) {
    if (event.data) {
      const { method, source, ...rest } = event.data as { method?: string, source?: string };

      if (source !== MCPClientTransportSourceId && (method?.startsWith('mcp:') || 'mcpSessionId' in event.data)) {
        const message = { method, ...rest } as MCPMessageFromContentScript;

        if (method !== 'mcp:ping') {
          console.debug('MCPContentManager.handleMessageFromWindow received MCP message', message);
        }

        if (message.method) {
          // add tabId so that MCPClientTransport can respond to the correct tab
          message.tabId = this.tabId;
        }
        // forward to background script
        chrome.runtime.sendMessage(message);
      }
    }
  }

  private handleMCPMessageFromBackground(message: { method?: string, source?: string }) {
    const { method, source, ...rest } = message;
    if (source === MCPClientTransportSourceId && method?.startsWith('mcp:')) {
      console.debug('MCPContentManager.handleMCPMessageFromBackground forwarding MCP message to app', message);
      window.postMessage(message, '*');
    }
  }
}
