import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faBrain } from '@fortawesome/free-solid-svg-icons';

interface OutputHeaderProps {
  onClearHistory: () => void;
  onReflectAndLearn: () => void;
  isProcessing: boolean;
}

export const OutputHeader: React.FC<OutputHeaderProps> = ({
  onClearHistory,
  onReflectAndLearn,
  isProcessing
}) => {
  return (
    <div className="flex justify-between items-center bg-base-300 p-3">
      <div className="card-title text-base-content text-lg">
        Output
      </div>
      <div className="flex items-center gap-2">
        <div className="tooltip tooltip-bottom" data-tip="Reflect and learn from this session">
          <button 
            onClick={onReflectAndLearn}
            className="btn btn-sm btn-outline btn-primary"
            disabled={isProcessing}
          >
            <FontAwesomeIcon icon={faBrain} />
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="Clear conversation history and LLM context">
          <button 
            onClick={onClearHistory}
            className="btn btn-sm btn-outline"
            disabled={isProcessing}
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>
    </div>
  );
};
