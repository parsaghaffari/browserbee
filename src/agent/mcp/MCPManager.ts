import { JSONRPCMessage } from "../a2a/schema";

export class MCPManager {
  private static instance: MCPManager;
  private static sourceId = 'mcp-client';

  public static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  listenFromContentScript() {
    console.info('MCPManager.listenFromContentScript...');
    window.addEventListener("message", function(event) {
      console.info('MCPManager.listenFromContentScript received message event', event);
      // Only accept messages from the page itself, not iframes or other extensions
      if (event.source !== window) return;

      // Optionally filter messages
      if (event.data && event.data.source !== MCPManager.sourceId) {
        chrome.runtime.sendMessage(event.data);
      }
    });
  }

    // TODO: call from background
  listenFromBackground() {
    chrome.runtime.onMessageExternal.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      console.log('Received external message:', message, sender, sendResponse);

      if (message.method === 'mcp:server/started') {

      }

      return true; // allow async
    });
  }
}
