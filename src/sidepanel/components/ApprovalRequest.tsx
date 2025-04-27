import React from 'react';

interface ApprovalRequestProps {
  requestId: string;
  toolName: string;
  toolInput: string;
  reason: string;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export function ApprovalRequest({ 
  requestId, 
  toolName, 
  toolInput, 
  reason, 
  onApprove, 
  onReject 
}: ApprovalRequestProps) {
  return (
    <div className="card bg-warning text-warning-content p-4 my-2">
      <h3 className="font-bold">Approval Required</h3>
      <p>The agent wants to execute a critical action:</p>
      <div className="bg-base-300 p-2 my-2 rounded">
        <p><strong>Tool:</strong> {toolName}</p>
        <p><strong>Input:</strong> {toolInput}</p>
        {reason && <p><strong>Reason:</strong> {reason}</p>}
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button 
          className="btn btn-error" 
          onClick={() => onReject(requestId)}
        >
          Reject
        </button>
        <button 
          className="btn btn-success" 
          onClick={() => onApprove(requestId)}
        >
          Approve
        </button>
      </div>
    </div>
  );
}
