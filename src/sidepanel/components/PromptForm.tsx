import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';

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
    <form onSubmit={handleSubmit} className="mt-4 relative">
      <div className="w-full">
        <TextareaAutosize
          className="textarea textarea-bordered w-full pr-12"
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
          placeholder="Type a message..."
          autoFocus
          disabled={isProcessing}
          minRows={1}
          maxRows={10}
          style={{ 
            resize: 'none',
            minHeight: '40px',
            maxHeight: '300px',
            overflow: 'auto'
          } as any}
        />
        {isProcessing ? (
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-sm btn-circle btn-error absolute"
            style={{ bottom: '5px', right: '5px' }}
            title="Cancel"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        ) : (
          <button 
            type="submit" 
            className="btn btn-sm btn-circle btn-primary absolute"
            style={{ bottom: '5px', right: '5px' }}
            disabled={!prompt.trim()}
            title="Execute"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        )}
      </div>
    </form>
  );
};
