import React from 'react';

interface SaveButtonProps {
  isSaving: boolean;
  saveStatus: string;
  handleSave: () => void;
  isDisabled: boolean;
}

export function SaveButton({ isSaving, saveStatus, handleSave, isDisabled }: SaveButtonProps) {
  return (
    <>
      <button 
        onClick={handleSave} 
        disabled={isSaving || isDisabled}
        className="btn btn-primary"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
      
      {saveStatus && <div className="alert alert-success mt-4">{saveStatus}</div>}
    </>
  );
}
