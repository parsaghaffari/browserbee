import React from 'react';
import { Message } from '../types';
import { LlmContent } from './LlmContent';
import { ScreenshotMessage } from './ScreenshotMessage';

interface MessageDisplayProps {
  messages: Message[];
  streamingSegments: Record<number, string>;
  isStreaming: boolean;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  messages,
  streamingSegments,
  isStreaming
}) => {
  // Always show all messages
  const filteredMessages = messages;

  if (filteredMessages.length === 0 && Object.keys(streamingSegments).length === 0) {
    return <p className="text-gray-500">No output yet</p>;
  }

  return (
    <div>
      {/* Render completed messages in their original order */}
      {filteredMessages.map((msg, index) => (
        <div key={`msg-${index}`} className="mb-2">
          {msg.type === 'system' ? (
            <div className="bg-base-200 px-3 py-1 rounded text-gray-500 text-sm">
              {msg.content}
            </div>
          ) : msg.type === 'screenshot' && msg.imageData ? (
            <ScreenshotMessage imageData={msg.imageData} mediaType={msg.mediaType} />
          ) : (
            <LlmContent content={msg.content} />
          )}
        </div>
      ))}
      
      {/* Render currently streaming segments at the end */}
      {isStreaming && Object.entries(streamingSegments).map(([id, content]) => (
        <div key={`segment-${id}`} className="mb-2 animate-pulse">
          <LlmContent content={content} />
        </div>
      ))}
    </div>
  );
};
