import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
// import { generateUuid } from "../../background/utils";
import { JSONRPCMessage } from "../a2a/schema";
import { JSONRPCNotification, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { MCPMessageFromContentScript } from "./MCPManager";

export const MCPClientTransportSourceId = 'mcp-client';

/**
 * This class allows our extension to access MCP servers
 */
export default class MCPClientTransport implements Transport {
  private _sessionId?: string;
  private expectedSessionId: string;
  // private tabId: number;
  // private windowId: number;
  sourceId = MCPClientTransportSourceId;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { /*authInfo?: AuthInfo*/ }) => void;

  // MCP Client Transport is created when MCPManager receives a MCP ping for an unknown sessionId
  constructor(
    sessionId: string,
    private tabId: number,
    // windowId: number
  ) {
    this.expectedSessionId = sessionId;
    // this.tabId = tabId;
    // this.windowId = windowId;
  }

  async start(): Promise<void> {
    // this.sendRequestOrNotification('ping', {});
    // chrome.runtime.onMessageExternal.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    //   console.info('MCPClientTransport received external message:', message, sender, sendResponse);

    //   // if (message.method === 'mcp:server/started') {

    //   // }

    //   return true; // allow async
    // });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // console.log("MCPClientTransport received runtime message:", message, sender);
      this.handleMessage(message);
    });

    // if (typeof window !== "undefined") {
    //   window.addEventListener("message", (event) => {
    //     // console.log("MCPClientTransport received message:", event);
    //     this.handleMessage(event.data);
    //   });
    // }

    console.info('MCPClientTransport started for sessionId:', this.sessionId);
  }

  private handleMessage(message: JSONRPCMessage): void {
    if ((message as any).source === "react-devtools-content-script" || (message as any).method === "mcp:ping") {
      return;
    }
    console.log("MCPClientTransport.handleMessage:", message);
    const { method, source, mcpSessionId, tabId, ...rest } = message as MCPMessageFromContentScript;
      if (this._sessionId === undefined && mcpSessionId === this.expectedSessionId) {
        console.info('MCPClientTransport received message from MCP server with new sessionId:', method, mcpSessionId);
        this._sessionId = mcpSessionId;
      }
      // if (mcpSessionId && mcpSessionId !== this._sessionId) {
      //   return;
      // }

      if (mcpSessionId && mcpSessionId === this._sessionId) {
      // if (source !== this.sourceId && method?.startsWith('mcp:')) {
        const message = { ...rest } as JSONRPCMessage;
        if (method) {
          (message as JSONRPCRequest).method = method;
        }
        console.log("MCPClientTransport received message from MCP server:", message);
        this.onmessage?.(message);
      // } else {
      //   console.warn('MCPClientTransport received message from MCP server with wrong sessionId:', mcpSessionId);
      }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    // debugger;
    console.debug('MCPClientTransport send:', message);
    if ('method' in message) {
      const { method, ...rest } = message as { method: string, [key: string]: any };
      this.sendRequestOrNotification(method, rest);
    } else {
      this.sendMessage(message);
    }
  }

  private sendRequestOrNotification(method: string, rest: {[key: string]: any}) {
    method = 'mcp:' + method;
    this.sendMessage({ method, ...rest });
  }

  private sendMessage(message: any) {
    console.info('MCPClientTransport sendMessage to tabId:', this.tabId, message);
    // if (typeof window !== "undefined") {
    //   window.postMessage({ source: this.sourceId, ...message }, '*');
    // } else {
    //   console.info('MCPClientTransport sendMessage using chrome.runtime.sendMessage', new Date().getTime());
    //   chrome.runtime.sendMessage({ source: this.sourceId, ...message });
    // }
    chrome.tabs.sendMessage(this.tabId, { source: this.sourceId, ...message });
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }
}
