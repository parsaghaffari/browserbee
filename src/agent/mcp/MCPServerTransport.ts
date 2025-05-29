import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { generateUuid } from "../../background/utils";
import { JSONRPCMessage } from "../a2a/schema";

/**
 * This class could be used with https://github.com/modelcontextprotocol/typescript-sdk
 * by web apps or content scripts ofbrowser extensions to provide tools which can be used by browserbee.
 */
export default class MCPServerTransport implements Transport {
  private _sessionId: string;
  private sourceId = 'mcp-server';
  private pingInterval: NodeJS.Timeout;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { /*authInfo?: AuthInfo*/ }) => void;

  constructor() {
    this._sessionId = generateUuid();

    // Periodically send a ping to notify the extension that the MCP server is available
    this.pingInterval = setInterval(() => {
      this.sendRequestOrNotificationToExtension('ping', {});
    }, 1000);
  }

  async start(): Promise<void> {
    window.addEventListener('message', (e) => {
      const { method, source, ...rest } = e.data as { method?: string, source?: string };
      if (source === this.sourceId) {
        // ignore messages from this mcp-server
        return;
      }

      if (method?.startsWith('mcp:')) {
        const message = { method: method.slice(4), ...rest } as JSONRPCMessage;
        console.debug('MCPServerTransport received MCP message:', message);
        this.onmessage?.(message);
      }
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if ('method' in message) {
      const { method, params } = message as { method: string, params?: any };
      this.sendRequestOrNotificationToExtension(method, params);
    } else {
      this.sendMessageToExtension(message);
    }
  }

  async close(): Promise<void> {
    this.onclose?.();
    clearInterval(this.pingInterval);
  }

  private sendRequestOrNotificationToExtension(method: string, params: any) {
    method = 'mcp:' + method;
    this.sendMessageToExtension({ method, params });
  }

  protected sendMessageToExtension(message: any) {
    if (message.method !== 'mcp:ping') {
      console.debug('MCPServerTransport sending message:', message);
    }
    message.mcpSessionId = this.sessionId;
    message.source = this.sourceId;
    window.postMessage(message, '*');
  }

  get sessionId(): string {
    return this._sessionId;
  }
}
