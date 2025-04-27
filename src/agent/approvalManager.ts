// Pending approvals map
const pendingApprovals = new Map<string, {
  resolve: (approved: boolean) => void,
  toolName: string,
  toolInput: string,
  reason: string
}>();

/**
 * Requests approval from the user for a tool execution
 * @param tabId The tab ID to request approval for
 * @param toolName The name of the tool being executed
 * @param toolInput The input to the tool
 * @param reason The reason approval is required
 * @returns A promise that resolves to true if approved, false if rejected
 */
export async function requestApproval(
  tabId: number,
  toolName: string,
  toolInput: string,
  reason: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const requestId = generateUniqueId();
    pendingApprovals.set(requestId, { resolve, toolName, toolInput, reason });
    
    // Send approval request to UI
    chrome.runtime.sendMessage({
      action: 'requestApproval',
      tabId,
      requestId,
      toolName,
      toolInput,
      reason
    });
  });
}

/**
 * Handles an approval response from the UI
 * @param requestId The ID of the approval request
 * @param approved Whether the request was approved
 */
export function handleApprovalResponse(requestId: string, approved: boolean): void {
  const pendingApproval = pendingApprovals.get(requestId);
  if (pendingApproval) {
    pendingApproval.resolve(approved);
    pendingApprovals.delete(requestId);
  }
}

/**
 * Generates a unique ID for approval requests
 * @returns A unique ID string
 */
function generateUniqueId(): string {
  return `approval_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
