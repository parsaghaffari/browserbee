import { generateUuid } from "../../background/utils";
import { JSONRPCMessage } from "../a2a/schema";

/**
 * This class allows our extension to access MCP servers
 *
 */
class MCPClientTransport { // implements Transport {
  private _sessionId: string;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { /*authInfo?: AuthInfo*/ }) => void;

  constructor() {
    this._sessionId = generateUuid();
  }

  async start(): Promise<void> {

  }

  async send(message: JSONRPCMessage): Promise<void> {
    if ('method' in message) {
      const { method, params } = message as { method: string, params?: any };
      this.sendRequestOrNotification(method, params);
    } else {
      this.sendMessage(message);
    }
  }

  private sendRequestOrNotification(method: string, params: any) {
    method = 'mcp:' + method;
    this.sendMessage({ method, params });
  }

  private sendMessage(message: any) {
    chrome.runtime.sendMessage(message);
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  get sessionId(): string {
    return this._sessionId;
  }
}
