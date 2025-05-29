import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
// import { generateUuid } from "../../background/utils";
import { JSONRPCMessage } from "../a2a/schema";
import { JSONRPCNotification, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";

export const MCPClientTransportSourceId = 'mcp-client';

/**
 * This class allows our extension to access MCP servers
 */
export default class MCPClientTransport implements Transport {
  private _sessionId?: string;
  sourceId = MCPClientTransportSourceId;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { /*authInfo?: AuthInfo*/ }) => void;

  // MCP Client Transport is created when MCPManager receives a MCP ping for an unknown sessionId
  constructor(sessionId: string) {
    this._sessionId = sessionId;
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
      console.log("MCPClientTransport received runtime message:", message, sender);
      this.handleMessage(message);
    });

    if (typeof window !== "undefined") {
      window.addEventListener("message", (event) => {
        // console.log("MCPClientTransport received message:", event);
        this.handleMessage(event.data);
      });
    }
  }

  private handleMessage(message: JSONRPCMessage): void {
    if ((message as any).source === "react-devtools-content-script" || (message as any).method === "mcp:ping") {
      return;
    }
    console.log("MCPClientTransport.handleMessage:", message);
    const { method, source, mcpSessionId, ...rest } = message as { method?: string, source?: string, mcpSessionId?: string };
      // if (this._sessionId === undefined) {
      //   this._sessionId = mcpSessionId;
      // }
      // if (mcpSessionId && mcpSessionId !== this._sessionId) {
      //   return;
      // }

      if (source !== this.sourceId && method?.startsWith('mcp:') || (mcpSessionId && mcpSessionId === this._sessionId)) {
        const message = { ...rest } as JSONRPCMessage;
        if (method) {
          (message as JSONRPCNotification).method = method;
        }
        console.log("MCPClientTransport received message from MCP server:", message);
        this.onmessage?.(message);
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
    console.info('MCPClientTransport sendMessage:', message);
    if (typeof window !== "undefined") {
      window.postMessage({ source: this.sourceId, ...message }, '*');
    } else {
      console.info('MCPClientTransport sendMessage using chrome.runtime.sendMessage', new Date().getTime());
      chrome.runtime.sendMessage({ source: this.sourceId, ...message });
    }
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }
}
