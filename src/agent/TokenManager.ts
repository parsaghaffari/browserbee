import Anthropic from "@anthropic-ai/sdk";

// Generic message interface for token counting
interface GenericMessage {
  role: string;
  content: string | any;
}

/**
 * TokenManager handles token estimation, message history trimming,
 * and context window management.
 */

// Constants for token management
const MAX_CONTEXT_TOKENS = 12_000; // rough cap for messages sent to the LLM

/** Very cheap "char/4" token estimator. */
export const approxTokens = (text: string) => Math.ceil(text.length / 4);

/**
 * Calculate the total token count for a list of messages
 */
export const contextTokenCount = (msgs: Anthropic.MessageParam[] | GenericMessage[]) =>
  msgs.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return sum + approxTokens(content);
  }, 0);

/**
 * Intelligently trim message history while preserving all user messages.
 * 
 * This function prioritizes keeping user messages (especially the original request)
 * while trimming assistant responses when needed to stay under the token limit.
 */
export function trimHistory(
  msgs: Anthropic.MessageParam[],
  maxTokens = MAX_CONTEXT_TOKENS
) {
  // If we're under the limit or have very few messages, no need to trim
  if (contextTokenCount(msgs) <= maxTokens || msgs.length <= 2) {
    return msgs;
  }
  
  // Track which indices we want to keep
  const indicesToKeep = new Set<number>();
  
  // Always keep the first message (original request)
  if (msgs.length > 0) {
    indicesToKeep.add(0);
  }
  
  // First pass: mark all user messages to keep
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i].role === "user") {
      indicesToKeep.add(i);
    }
  }
  
  // Calculate token count for all messages we're definitely keeping
  const keptMessages = Array.from(indicesToKeep).map(i => msgs[i]);
  const keptTokenCount = contextTokenCount(keptMessages);
  let remainingTokens = maxTokens - keptTokenCount;
  
  // Second pass: add assistant messages from newest to oldest until we hit the token limit
  const assistantIndices: number[] = [];
  for (let i = msgs.length - 1; i >= 1; i--) {
    if (msgs[i].role === "assistant" && !indicesToKeep.has(i)) {
      assistantIndices.push(i);
    }
  }
  
  // Try to add each assistant message if it fits in our token budget
  for (const idx of assistantIndices) {
    const msg = msgs[idx];
    const msgTokens = contextTokenCount([msg]);
    
    if (msgTokens <= remainingTokens) {
      indicesToKeep.add(idx);
      remainingTokens -= msgTokens;
    }
  }
  
  // Build the final trimmed array in the original order
  const trimmedMsgs: Anthropic.MessageParam[] = [];
  for (let i = 0; i < msgs.length; i++) {
    if (indicesToKeep.has(i)) {
      trimmedMsgs.push(msgs[i]);
    }
  }
  
  return trimmedMsgs;
}
