import { useState, useRef, useEffect } from 'react';
import { Message } from '../types';

export const useMessageManagement = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingSegments, setStreamingSegments] = useState<Record<number, string>>({});
  const [currentSegmentId, setCurrentSegmentId] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or streaming segments change
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages, streamingSegments]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, { ...message, isComplete: true }]);
  };

  const addSystemMessage = (content: string) => {
    addMessage({ type: 'system', content });
  };

  const updateStreamingChunk = (content: string) => {
    setIsStreaming(true);
    setStreamingSegments(prev => ({
      ...prev,
      [currentSegmentId]: (prev[currentSegmentId] || '') + content
    }));
  };

  const finalizeStreamingSegment = (id: number, content: string) => {
    // Add the finalized segment as a complete message
    addMessage({ 
      type: 'llm', 
      content,
      segmentId: id
    });
    
    // Remove the segment from streaming segments
    setStreamingSegments(prev => {
      const newSegments = { ...prev };
      delete newSegments[id];
      return newSegments;
    });
  };

  const startNewSegment = (id: number) => {
    setCurrentSegmentId(id);
  };

  const completeStreaming = () => {
    setIsStreaming(false);
    setStreamingSegments({});
  };

  const clearMessages = () => {
    setMessages([]);
    setStreamingSegments({});
  };

  return {
    messages,
    streamingSegments,
    isStreaming,
    isProcessing,
    setIsProcessing,
    outputRef,
    addMessage,
    addSystemMessage,
    updateStreamingChunk,
    finalizeStreamingSegment,
    startNewSegment,
    completeStreaming,
    clearMessages,
    currentSegmentId
  };
};
