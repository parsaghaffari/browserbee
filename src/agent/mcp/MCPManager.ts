import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import MCPClientTransport, { MCPClientTransportSourceId } from "./MCPClientTransport";
import { JSONRPCMessage } from "../a2a/schema";
import { BrowserTool } from "../tools/types";
import { TabState } from "../../background/types";
import pkg from "../../../package.json";

export interface MCPMessageFromContentScript extends JSONRPCMessage {
  mcpSessionId: string;
  method?: string;
  tabId: number;
  senderId?: string;
  source: string;
}

interface PingMessage extends MCPMessageFromContentScript {
}

/** MCP Manager for the background script & tab */
export class MCPManager {
  private onToolsReceived?: (tools: BrowserTool[]) => void;
  private tabId: number;
  // private windowId: number = 0;
  private clientsBySession: Record<string, Client> = {};

  constructor(tabState: TabState) {
    this.tabId = tabState.tabId!;
    // chrome.tabs.get(this.tabId).then((tab) => {
    //   this.windowId = tab.windowId;
    // });

  //   // @ts-ignore
  //   if (chrome.sidePanel.onHidden) {
  //     // @ts-ignore
  //     chrome.sidePanel.onHidden.addListener(async (info: { tabId?: number }) => {
  //       if (info.tabId) {
  //         const tab = await chrome.tabs.get(info.tabId);
  //         const windowId = tab.windowId;

  //         chrome.runtime.sendMessage({
  //           action: 'deactivateAgent',
  //           tabId: info.tabId,
  //           windowId: windowId
  //         })
  //       }
  //     });
  //   }

    // sender.id is the extension ID, sender.origin = chrome-extension://{extensionId}, sender.url = {origin}/src/sidepanel.html
    chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      // console.info('MCPManager received message', message);
      // if (message.action === 'mcp:toolsReceived') {
      //   if (this.onToolsReceived) {
      //     // TODO: map to BrowserTool with func that uses sessionId
      //     this.onToolsReceived(message.tools);
      //   }
      // }

      this.handleMessage(message);

      // return true;  // true or Promise if using sendResponse()
    });

    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      if (message.method !== "mcp:ping") {
        console.info('MCPManager received external message', message, sender);
      }
      message.senderId = sender.id;
      this.handleMessage(message);
    });
  }

    // when side panel shown - chrome.runtime.sendMessage({ action: 'initializeTab', tabId, windowId? });
  //       messageHandler.handleInitializeTab()
  //            initializeAgent()

  // AgentCore/BrowserAgent requests tools from MCP servers
  requestToolsForAgent(onToolsReceived: (tools: BrowserTool[]) => void) {
    console.info('MCPManager.requestToolsForAgent', this.tabId, new Date().getTime());

    this.onToolsReceived = onToolsReceived;

    // chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    //   this.handleMessage(message);
    // });

    console.info('MCPManager.requestToolsForAgent sending mcp:activate message to tabId:', this.tabId);
    chrome.tabs.sendMessage(this.tabId, {
      action: 'mcp:activate',
      tabId: this.tabId,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Could not send message to content script:', chrome.runtime.lastError.message);
      }
    });
  }

  // handleActionMessage(message: { action: string }) {
  //   switch (message.action) {
  //     case 'requestToolsForAgent':
  //       if (!this.active) {
  //         this.active = true;
  //         window.addEventListener('message', this.handleMessageFromWindow.bind(this));
  //       }
  //   }
  //   return true;
  // }

  private handleMessage(message: any) {
    const { method } = message;
    // if (source === MCPClientTransportSourceId &&
    if (method?.startsWith('mcp:')) {
      this.handleMCPMessage(method.slice(4), message);
    }
  }

  private handleMCPMessage(method: string, message: Record<string, any>) {
      // const message = { method: method.slice(4), ...rest } as JSONRPCMessage;
      // const message = { method, ...rest } as JSONRPCMessage;

    // window.postMessage(message, '*');
    if (method === 'ping') {
      this.handlePing(message as PingMessage);
    } else {
      console.info('MCPManager.handleMCPMessage received MCP message', method, message);
    }
  }

  private handlePing(message: PingMessage) {
    const { mcpSessionId: sessionId, tabId, senderId } = message;
    if (sessionId in this.clientsBySession === false) {
      console.info('MCPManager.handlePing creating new MCP client for session:', sessionId, tabId, senderId);
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
    console.info('MCPManager.fetchToolsFromMCP received tools', tools);
    const browserTools = tools.map<BrowserTool>(tool => {
      const { $schema, ...schema } = tool.inputSchema;
      return {
        name: tool.name,
        description: tool.description || JSON.stringify(schema),
        func: async (input: string) => {
          const args = input ? JSON.parse(input) : undefined;
          const toolResult = await client.callTool({ name: tool.name, arguments: args });
          console.info('toolResult:', toolResult);
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
      if (event.data.source == 'react-devtools-content-script') {
        return;
      }
      // console.info('MCPContentManager handleMessageFromWindow received message event', event);

      const { method, source, ...rest } = event.data as { method?: string, source?: string };

      if (source !== MCPClientTransportSourceId && (method?.startsWith('mcp:') || 'mcpSessionId' in event.data)) {
        // const message = { method: method.slice(4), ...rest } as JSONRPCMessage;
        const message = { method, ...rest } as MCPMessageFromContentScript;

        if (method === 'mcp:ping') {
        //   this.handlePing(message as PingMessage);
        } else {
          console.info('MCPContentManager.handleMessageFromWindow received MCP message', message);
          // console.info('  is window? source:', event.source == window, ', target:', event.target == window);
          // TODO: probably need to uncomment to forward messages to the background script
        }

        if (message.method) {
          // add tabId so that MCPClientTransport can respond to the correct tab
          message.tabId = this.tabId;
        }
        // forward to background script
        chrome.runtime.sendMessage(message);
      // } else {
      //   console.info('MCPContentManager.handleMessageFromWindow received unhandled message event', event.data);
      }
    // } else {
    //   console.info('MCPContentManager.handleMessageFromWindow received message event without data', event);
    }
  }

  private handleMCPMessageFromBackground(message: { method?: string, source?: string }) {
    const { method, source, ...rest } = message;
    if (source === MCPClientTransportSourceId && method?.startsWith('mcp:')) {
      // const message = { method: method.slice(4), ...rest } as JSONRPCMessage;
      // const message = { method, ...rest } as JSONRPCMessage;
      console.info('MCPContentManager.handleMCPMessageFromBackground forwarding MCP message to app', message);
      window.postMessage(message, '*');
    } else {
      console.info('MCPContentManager.handleMCPMessageFromBackground received message event', message);
    }
  }
}
