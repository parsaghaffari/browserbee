import { sendUIMessage } from './utils';

// Streaming buffer and regex patterns
let streamingBuffer = '';
const combinedToolCallRegex = /(```(?:xml|bash)\s*)?<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?:\s*<requires_approval>(.*?)<\/requires_approval>)?(\s*```)?/;
const sentenceEndRegex = /[.!?]\s+/;

// Current streaming segment ID
let currentSegmentId = 0;

/**
 * Reset streaming state
 */
export function resetStreamingState(): void {
  streamingBuffer = '';
  currentSegmentId = 0;
}

/**
 * Get the current segment ID
 * @returns The current segment ID
 */
export function getCurrentSegmentId(): number {
  return currentSegmentId;
}

/**
 * Increment the segment ID
 * @returns The new segment ID
 */
export function incrementSegmentId(): number {
  return ++currentSegmentId;
}

/**
 * Process the streaming buffer to send complete sentences and tool calls
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function processStreamingBuffer(tabId?: number, windowId?: number): void {
  // Check if buffer contains a complete tool call (either direct or in a code block)
  const toolCallMatch = streamingBuffer.match(combinedToolCallRegex);
  
  if (toolCallMatch) {
    // When a tool call is detected, we don't send any more streaming chunks
    // The entire segment (including text before the tool call) will be finalized together
    // This prevents duplication of content in the UI
    
    // We keep the entire buffer intact, including the tool call
    // It will be handled by onSegmentComplete after the tool execution
    
    return;
  }
  
  // If no complete tool call, check for complete sentences
  const sentenceMatch = streamingBuffer.match(sentenceEndRegex);
  
  if (sentenceMatch) {
    const lastSentenceEnd = streamingBuffer.lastIndexOf(sentenceMatch[0]) + sentenceMatch[0].length;
    
    // Send complete sentences
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: streamingBuffer.substring(0, lastSentenceEnd)
    }, tabId, windowId);
    
    // Keep remainder in buffer
    streamingBuffer = streamingBuffer.substring(lastSentenceEnd);
  } else if (streamingBuffer.length > 100) {
    // If buffer is getting long without sentence breaks, send it anyway
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: streamingBuffer
    }, tabId, windowId);
    streamingBuffer = '';
  }
  // Otherwise keep accumulating in buffer
}

/**
 * Add a chunk to the streaming buffer
 * @param chunk The chunk to add
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function addToStreamingBuffer(chunk: string, tabId?: number, windowId?: number): void {
  streamingBuffer += chunk;
  processStreamingBuffer(tabId, windowId);
}

/**
 * Get the current streaming buffer content
 * @returns The current streaming buffer content
 */
export function getStreamingBuffer(): string {
  return streamingBuffer;
}

/**
 * Set the streaming buffer content
 * @param content The content to set
 */
export function setStreamingBuffer(content: string): void {
  streamingBuffer = content;
}

/**
 * Clear any remaining content in the streaming buffer
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function clearStreamingBuffer(tabId?: number, windowId?: number): void {
  if (streamingBuffer.length > 0) {
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: streamingBuffer
    }, tabId, windowId);
    streamingBuffer = '';
  }
}

/**
 * Finalize a streaming segment
 * @param segmentId The segment ID to finalize
 * @param content The content of the segment
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function finalizeStreamingSegment(segmentId: number, content: string, tabId?: number, windowId?: number): void {
  sendUIMessage('finalizeStreamingSegment', {
    id: segmentId,
    content
  }, tabId, windowId);
}

/**
 * Start a new streaming segment
 * @param segmentId The segment ID to start
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function startNewSegment(segmentId: number, tabId?: number, windowId?: number): void {
  sendUIMessage('startNewSegment', {
    id: segmentId
  }, tabId, windowId);
}

/**
 * Signal that streaming is complete
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function signalStreamingComplete(tabId?: number, windowId?: number): void {
  sendUIMessage('streamingComplete', null, tabId, windowId);
}
