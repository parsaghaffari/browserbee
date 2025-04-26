import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';

interface OutputHeaderProps {
  showSystemMessages: boolean;
  setShowSystemMessages: (show: boolean) => void;
  onClearHistory: () => void;
}

export const OutputHeader: React.FC<OutputHeaderProps> = ({
  showSystemMessages,
  setShowSystemMessages,
  onClearHistory
}) => {
  return (
    <div className="flex justify-between items-center bg-base-300 p-3">
      <div className="card-title text-base-content text-lg">
        Output
      </div>
      <div className="flex items-center gap-2">
        <div className="tooltip tooltip-bottom" data-tip="Clear conversation history and LLM context">
          <button 
            onClick={onClearHistory}
            className="btn btn-sm btn-outline"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text mr-2">System messages</span> 
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-sm" 
              checked={showSystemMessages}
              onChange={() => setShowSystemMessages(!showSystemMessages)}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
