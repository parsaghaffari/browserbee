import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

interface PromptFormProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const PromptForm: React.FC<PromptFormProps> = ({
  onSubmit,
  onCancel,
  isProcessing
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    onSubmit(prompt);
    setPrompt(''); // Clear the prompt after submission
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col mb-4">
      <div className="w-full mb-2">
        <TextareaAutosize
          className="textarea textarea-bordered w-full"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            // Check if Enter was pressed without Shift key
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); // Prevent default behavior (new line)
              handleSubmit(e); // Submit the form
            }
            // Allow Shift+Enter to create a new line (default behavior)
          }}
          placeholder="Enter your prompt (e.g., 'go to google.com, search for Cicero, and click on the first result')"
          disabled={isProcessing}
          minRows={1}
          maxRows={10}
          style={{ 
            resize: 'none',
            minHeight: '38px',
            maxHeight: '300px',
            overflow: 'auto'
          } as any}
        />
      </div>
      <div className="flex justify-end gap-2">
        {isProcessing && (
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-error"
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isProcessing || !prompt.trim()}
        >
          {isProcessing ? 'Processing...' : 'Execute'}
        </button>
      </div>
    </form>
  );
};
