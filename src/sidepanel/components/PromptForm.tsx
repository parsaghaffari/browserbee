import { faMicrophone, faMicrophoneSlash, faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useChromeMessaging } from '../hooks/useChromeMessaging';
import { useTabManagement } from '../hooks/useTabManagement';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';


interface PromptFormProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  tabStatus: 'attached' | 'detached' | 'unknown' | 'running' | 'idle' | 'error';
}

export const PromptForm: React.FC<PromptFormProps> = ({
  onSubmit,
  onCancel,
  isProcessing,
  tabStatus
}) => {
  const [prompt, setPrompt] = useState('');
  // const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const {
      tabId,
      windowId,
    } = useTabManagement();

  const {
    recognitionSupported,
    startSpeechRecognition,
    processSpeechRecognition,
    cancelSpeechRecognition,
  } = useSpeechRecognition(tabId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing || tabStatus === 'detached') return;
    onSubmit(prompt);
    setPrompt(''); // Clear the prompt after submission
  };

  const toggleRecording = async () => {
    if (!recognitionSupported) return;

    if (isRecording) {
      const result = await processSpeechRecognition();
      console.log("toggleRecording result", result);
      setPrompt(result);
    } else {
      setPrompt('');
      startSpeechRecognition();
    }

    setIsRecording(!isRecording);
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
          placeholder={tabStatus === 'detached'
            ? "Tab connection lost. Please refresh the tab to continue."
            : "Type a message..."}
          autoFocus
          disabled={isProcessing || tabStatus === 'detached'}
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
          <>
            {recognitionSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                className="btn btn-sm btn-circle absolute"
                style={{ bottom: '5px', right: '40px' }}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                <FontAwesomeIcon icon={isRecording ? faMicrophoneSlash : faMicrophone} />
              </button>
            )}
            <button
              type="submit"
              className="btn btn-sm btn-circle btn-primary absolute"
              style={{ bottom: '5px', right: '5px' }}
              disabled={!prompt.trim() || tabStatus === 'detached'}
              title={tabStatus === 'detached' ? "Refresh tab to continue" : "Execute"}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </>
        )}
      </div>
    </form>
  );
};
