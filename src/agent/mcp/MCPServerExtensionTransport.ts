import MCPServerTransport from "./MCPServerTransport";

const browserbeeExtensionId = 'ilkklnfjpfoibgokaobmjhmdamogjcfj';

export default class MCPServerExtensionTransport extends MCPServerTransport {
  protected sendMessageToExtension(message: any) {
    chrome.runtime.sendMessage(browserbeeExtensionId, message);
  }
}
