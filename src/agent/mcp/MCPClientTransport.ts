import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCNotification, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { JSONRPCMessage } from "../a2a/schema";
import { MCPMessageFromContentScript } from "./MCPManager";

export const MCPClientTransportSourceId = 'mcp-client';

/**
 * This class allows our extension to access MCP servers
 */
export default class MCPClientTransport implements Transport {
  private _sessionId?: string;
  private expectedSessionId: string;
  sourceId = MCPClientTransportSourceId;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: any) => void; // extra?: { authInfo?: AuthInfo }

  // MCP Client Transport is created when MCPManager receives a MCP ping for an unknown sessionId
  constructor(
    sessionId: string,
    private tabId: number,
    private senderId?: string,
  ) {
    this.expectedSessionId = sessionId;
  }

  async start(): Promise<void> {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message);
    });

    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      if (message.method !== "mcp:ping") {
        console.debug('MCPClientTransport received external message', message, sender);
      }
      this.handleMessage(message);
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    console.debug('MCPClientTransport send:', message);
    if ('method' in message) {
      const { method, ...rest } = message as { method: string, [key: string]: any };
      this.sendRequestOrNotification(method, rest);
    } else {
      this.sendMessage(message);
    }
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }

  private handleMessage(message: JSONRPCMessage): void {
    if ((message as JSONRPCNotification).method === "mcp:ping") {
      return;
    }
    const { method, source, mcpSessionId, tabId, senderId, ...rest } = message as MCPMessageFromContentScript;
      if (this._sessionId === undefined && mcpSessionId === this.expectedSessionId) {
        console.debug('MCPClientTransport received message from MCP server with new sessionId:', method, mcpSessionId);
        this._sessionId = mcpSessionId;
      }

      if (mcpSessionId && mcpSessionId === this._sessionId) {
        const message = { ...rest } as JSONRPCMessage;
        if (method) {
          (message as JSONRPCRequest).method = method;
        }
        console.debug("MCPClientTransport received message from MCP server:", message);
        this.onmessage?.(message);
      // } else {
      //   console.warn('MCPClientTransport received message from MCP server with wrong sessionId:', mcpSessionId);
      }
  }

  private sendRequestOrNotification(method: string, rest: {[key: string]: any}) {
    method = 'mcp:' + method;
    this.sendMessage({ method, ...rest });
  }

  private sendMessage(message: any) {
    console.info('MCPClientTransport sendMessage to tabId:', this.tabId, this.senderId, message);
    if (this.tabId) {
      chrome.tabs.sendMessage(this.tabId, { source: this.sourceId, ...message });
    } else {
      chrome.runtime.sendMessage(this.senderId, { source: this.sourceId, ...message });
    }
  }
}
