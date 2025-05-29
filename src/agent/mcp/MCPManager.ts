import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { JSONRPCMessage } from "../a2a/schema";
import MCPClientTransport, { MCPClientTransportSourceId } from "./MCPClientTransport";
import pkg from "../../../package.json";
import { BrowserTool, ToolExecutionContext } from "../tools/types";
import { Page } from "playwright-crx";
import { TabState } from "../../background/types";
import { getTabState } from "../../background/tabManager";

interface PingMessage {
  // method: string;
  // source: string;
  mcpSessionId: string;
}

interface MCPToolSpec {
  name: string;
  description: string;
  sessionId: string;
}

export class MCPManager {
  private onToolsReceived?: (tools: MCPToolSpec[]) => void;

  constructor() {
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

    chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      console.info('MCPManager.requestToolsForAgent received tools', message);
      if (message.action === 'mcp:toolsReceived') {
        if (this.onToolsReceived) {
          // TODO: map to BrowserTool with func that uses sessionId
          this.onToolsReceived(message.tools);
        }
      }
    });
  }

  // when side panel shown - chrome.runtime.sendMessage({ action: 'initializeTab', tabId, windowId? });
  //       messageHandler.handleInitializeTab()
  //            initializeAgent()

  // AgentCore/BrowserAgent requests tools from MCP servers
  requestToolsForAgent(tabState: TabState, onToolsReceived: (tools: MCPToolSpec[]) => void) {
    console.info('MCPManager.requestToolsForAgent', tabState, new Date().getTime());

    this.onToolsReceived = onToolsReceived;

    chrome.tabs.sendMessage(tabState.tabId!, {
      action: 'requestToolsForAgent'
    });
  }
}

export class MCPContentManager {
  private active = false;
  private clients: Record<string, Client> = {};

  listenFromContentScript() {
    console.info('MCPManager.listenFromContentScript...', new Date().getTime());

    // TODO: content script is called much later than the background script
    chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      console.info('MCPManager.listenFromContentScript received message:', message,
        ', sender:', sender,
        ', sendResponse:', sendResponse);

      if ('action' in message) {
        this.handleActionMessage(message);
      } else {
        this.handleMCPMessageFromBackground(message);
      }

      return true;
    });
  }

  handleActionMessage(message: { action: string }) {
    switch (message.action) {
      case 'requestToolsForAgent':
        if (!this.active) {
          this.active = true;
          window.addEventListener('message', this.handleMessageFromWindow.bind(this));
        }
    }
    return true;
  }

  handleMessageFromWindow(event: MessageEvent) {
    // Only accept messages from the page itself, not iframes or other extensions
    // if (event.source !== window) return;

    if (event.data) {
      if (event.data.source == 'react-devtools-content-script') {
        return;
      }

      // console.info('MCPManager.listenFromContentScript received message event', event);

      const { method, source, ...rest } = event.data as { method?: string, source?: string };

      // Optionally filter messages
      if (source !== MCPClientTransportSourceId && method?.startsWith('mcp:')) {
        // const message = { method: method.slice(4), ...rest } as JSONRPCMessage;
        const message = { method, ...rest } as JSONRPCMessage;

        if (method === 'mcp:ping') {
          this.handlePing(message as PingMessage);
        } else {
          console.info('MCPContentManager.handleMessageFromWindow received MCP message', event);
          console.info('  is window? source:', event.source == window, ', target:', event.target == window);
          // TODO: probably need to uncomment to forward messages to the background script
          // chrome.runtime.sendMessage(message);
        }
      }
    } else {
      console.info('MCPContentManager.handleMessageFromWindow received message event without data', event);
    }
  }

  handleMCPMessageFromBackground(message: { method?: string, source?: string }) {
    const { method, source, ...rest } = message;
    if (source === MCPClientTransportSourceId && method?.startsWith('mcp:')) {
      // const message = { method: method.slice(4), ...rest } as JSONRPCMessage;
      // const message = { method, ...rest } as JSONRPCMessage;
      console.info('MCPContentManager.handleMCPMessageFromBackground forwarding MCP message to app', message);
      window.postMessage(message, '*');
    }
  }

  handlePing(message: PingMessage) {
    const sessionId = message.mcpSessionId;
    if (sessionId in this.clients === false) {
      console.info('MCPContentManager.handlePing creating new MCP client for session:', sessionId);
      const transport = new MCPClientTransport(sessionId);
      const client = new Client(
        {
          name: pkg.name,
          version: pkg.version
        }
      );

      client.connect(transport);
      this.clients[sessionId] = client;

      client.listTools().then(({ tools }) => {
        console.info('MCPContentManager.handlePing received tools', tools);
        try {
          chrome.runtime.sendMessage({
            action: 'mcp:toolsReceived',
            tools: tools.map<MCPToolSpec>(tool => {
              const { $schema, ...schema } = tool.inputSchema;
              return {
                name: tool.name,
                description: tool.description || JSON.stringify(schema),
                sessionId: sessionId
              }
            })
          });
        } catch (error) {
          console.info('MCPContentManager.handlePing received tools error', error);
        }
    });
    }
  }

  // TODO: call from background
  // listenFromBackground() {
  //   console.info('listenFromBackground...');
  //   chrome.runtime.onMessageExternal.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  //     console.info('MCPManager.listenFromBackground received external message:', message, sender, sendResponse);

  //     // if (message.method === 'mcp:server/started') {

  //     // }

  //     return true; // allow async
  //   });

  //   chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  //     const { method, source, ...rest } = message as { method?: string, source?: string };

  //     console.info('MCPManager.listenFromBackground received message:', message,
  //       ', sender:', sender,
  //       ', sendResponse:', sendResponse);

  //     // if (source === MCPManager.sourceId && method?.startsWith('mcp:')) {
  //     //   // const message = { method: method.slice(4), ...rest } as JSONRPCMessage;
  //     //   // const message = { method, ...rest } as JSONRPCMessage;
  //     //   console.info('MCPManager.listenFromBackground forwarding MCP message to app', message);
  //     //   window.postMessage(message, '*');
  //     // }

  //     // if (message.method === 'mcp:server/started') {

  //     // }

  //     return true; // allow async
  //   });
  // }

  // async createClient() {
  //   const transport = new MCPClientTransport();

  //   console.info('createClient...', pkg.name, pkg.version);
  //   const client = new Client(
  //     {
  //       name: pkg.name,
  //       version: pkg.version
  //     }
  //   );

  //   await client.connect(transport);
  //   console.info('client connected');

  //   const { tools } = await client.listTools();
  //   console.info('tools', tools);

  //   return client;
  // }
}


// async function foo() {
//   const transport = new MCPClientTransport();

//   const client = new Client(
//     {
//       name: pkg.name,
//       version: pkg.version
//     }
//   );

//   await client.connect(transport);
//   console.info('client connected');

//   const tools = await client.listTools();
//   console.info('tools', tools);
// }

// foo();
