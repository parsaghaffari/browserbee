import MCPServerTransport from "./MCPServerTransport";

const browserbeeExtensionId = 'ilkklnfjpfoibgokaobmjhmdamogjcfj';

/**
 * This class could be used with https://github.com/modelcontextprotocol/typescript-sdk
 * by browser extensions to provide tools which can be used by browserbee.
 */
export default class MCPServerExtensionTransport extends MCPServerTransport {
  async start(): Promise<void> {
    chrome.runtime.onMessageExternal.addListener((message) => {
      console.debug('MCPServerExtensionTransport received external message:', message);
      this.handleMessage(message);
    });
  }

  protected sendMessageToExtension(message: any) {
    if (message.method !== 'mcp:ping') {
      console.debug('MCPServerExtensionTransport sending message:', message);
    }
    message.mcpSessionId = this.sessionId;
    message.source = this.sourceId;
    chrome.runtime.sendMessage(browserbeeExtensionId, message, () => {
      if (chrome.runtime.lastError) {
        // browserbee is probably not installed/listening
        console.debug('MCPServerExtensionTransport received error:', chrome.runtime.lastError.message);
      }
    });
  }
}
