import MCPServerTransport from "./MCPServerTransport";

const browserbeeExtensionId = 'ilkklnfjpfoibgokaobmjhmdamogjcfj';

export default class MCPServerExtensionTransport extends MCPServerTransport {
  async start(): Promise<void> {
    // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //   this.handleMessage(message);
    // });

    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      console.info('MCPServerTransport received external message:', message);
      this.handleMessage(message);
    });
  }

  protected sendMessageToExtension(message: any) {
    if (message.method !== 'mcp:ping') {
      console.info('MCPServerTransport sending message:', message);
    }
    message.mcpSessionId = this.sessionId;
    message.source = this.sourceId;
    chrome.runtime.sendMessage(browserbeeExtensionId, message);
  }
}
