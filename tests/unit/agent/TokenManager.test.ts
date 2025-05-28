import { jest } from '@jest/globals';
import { approxTokens, contextTokenCount, trimHistory } from '../../../src/agent/TokenManager';
import Anthropic from '@anthropic-ai/sdk';

describe('TokenManager', () => {
  describe('approxTokens', () => {
    it('should estimate tokens using char/4 formula', () => {
      expect(approxTokens('hello')).toBe(2); // 5 chars / 4 = 1.25, ceil = 2
      expect(approxTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75, ceil = 3
      expect(approxTokens('a')).toBe(1); // 1 char / 4 = 0.25, ceil = 1
      expect(approxTokens('')).toBe(0); // 0 chars / 4 = 0, ceil = 0
    });

    it('should handle longer text correctly', () => {
      const longText = 'This is a longer piece of text that should be estimated correctly';
      const expectedTokens = Math.ceil(longText.length / 4);
      expect(approxTokens(longText)).toBe(expectedTokens);
    });

    it('should handle special characters and unicode', () => {
      expect(approxTokens('café')).toBe(1); // 4 chars
      expect(approxTokens('🚀🌟')).toBe(1); // 2 unicode chars
      expect(approxTokens('hello\nworld\ttab')).toBe(4); // 15 chars with newline and tab
    });

    it('should handle very long text', () => {
      const veryLongText = 'a'.repeat(10000);
      expect(approxTokens(veryLongText)).toBe(2500); // 10000 / 4 = 2500
    });

    it('should handle edge cases', () => {
      expect(approxTokens('abc')).toBe(1); // 3 chars / 4 = 0.75, ceil = 1
      expect(approxTokens('abcd')).toBe(1); // 4 chars / 4 = 1, ceil = 1
      expect(approxTokens('abcde')).toBe(2); // 5 chars / 4 = 1.25, ceil = 2
    });
  });

  describe('contextTokenCount', () => {
    it('should count tokens for simple messages', () => {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: 'hello' }, // 2 tokens
        { role: 'assistant', content: 'world' } // 2 tokens
      ];
      expect(contextTokenCount(messages)).toBe(4);
    });

    it('should handle empty messages array', () => {
      expect(contextTokenCount([])).toBe(0);
    });

    it('should handle messages with complex content', () => {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: 'This is a longer message' }, // 6 tokens
        { role: 'assistant', content: 'Short' } // 2 tokens
      ];
      expect(contextTokenCount(messages)).toBe(8);
    });

    it('should handle non-string content by stringifying', () => {
      const messages = [
        { role: 'user', content: { type: 'text', text: 'hello' } }, // JSON stringified
        { role: 'assistant', content: 'response' }
      ];
      const expectedTokens = approxTokens(JSON.stringify({ type: 'text', text: 'hello' })) + approxTokens('response');
      expect(contextTokenCount(messages)).toBe(expectedTokens);
    });

    it('should handle mixed content types', () => {
      const messages = [
        { role: 'user', content: 'simple text' },
        { role: 'assistant', content: { complex: 'object', with: ['array', 'items'] } },
        { role: 'user', content: 'another message' }
      ];
      
      const expectedTokens = 
        approxTokens('simple text') +
        approxTokens(JSON.stringify({ complex: 'object', with: ['array', 'items'] })) +
        approxTokens('another message');
      
      expect(contextTokenCount(messages)).toBe(expectedTokens);
    });

    it('should handle large message arrays efficiently', () => {
      const messages: Anthropic.MessageParam[] = Array.from({ length: 1000 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} with some content`
      }));

      const result = contextTokenCount(messages);
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });
  });

  describe('trimHistory', () => {
    const createMessage = (role: 'user' | 'assistant', content: string): Anthropic.MessageParam => ({
      role,
      content
    });

    it('should not trim when under token limit', () => {
      const messages = [
        createMessage('user', 'hello'),
        createMessage('assistant', 'hi')
      ];
      
      const result = trimHistory(messages, 1000);
      expect(result).toEqual(messages);
      expect(result.length).toBe(2);
    });

    it('should not trim when messages array is very small', () => {
      const messages = [
        createMessage('user', 'a'.repeat(20000)) // Very long message
      ];
      
      const result = trimHistory(messages, 100);
      expect(result).toEqual(messages);
      expect(result.length).toBe(1);
    });

    it('should preserve all user messages', () => {
      const messages = [
        createMessage('user', 'first user message'),
        createMessage('assistant', 'a'.repeat(4000)), // Large assistant message
        createMessage('user', 'second user message'),
        createMessage('assistant', 'a'.repeat(4000)), // Large assistant message
        createMessage('user', 'third user message')
      ];
      
      const result = trimHistory(messages, 100);
      
      // Should keep all user messages
      const userMessages = result.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(3);
      expect(userMessages[0].content).toBe('first user message');
      expect(userMessages[1].content).toBe('second user message');
      expect(userMessages[2].content).toBe('third user message');
    });

    it('should always keep the first message', () => {
      const messages = [
        createMessage('user', 'original request'),
        createMessage('assistant', 'a'.repeat(8000)),
        createMessage('user', 'follow up'),
        createMessage('assistant', 'a'.repeat(8000))
      ];
      
      const result = trimHistory(messages, 100);
      
      expect(result[0]).toEqual(messages[0]);
      expect(result[0].content).toBe('original request');
    });

    it('should prioritize newer assistant messages when trimming', () => {
      const messages = [
        createMessage('user', 'request'),
        createMessage('assistant', 'old response'),
        createMessage('assistant', 'newer response'),
        createMessage('assistant', 'newest response')
      ];
      
      const result = trimHistory(messages, 50);
      
      // Should keep user message and newest assistant messages that fit
      expect(result.some(m => m.content === 'request')).toBe(true);
      
      // Should prefer newer assistant messages
      const assistantMessages = result.filter(m => m.role === 'assistant');
      if (assistantMessages.length > 0) {
        expect(assistantMessages.some(m => m.content === 'newest response')).toBe(true);
      }
    });

    it('should handle complex trimming scenario', () => {
      const messages = [
        createMessage('user', 'start'), // Always kept
        createMessage('assistant', 'response1'),
        createMessage('user', 'question2'), // Always kept
        createMessage('assistant', 'response2'),
        createMessage('user', 'question3'), // Always kept
        createMessage('assistant', 'response3'),
        createMessage('assistant', 'response4')
      ];
      
      const result = trimHistory(messages, 100);
      
      // All user messages should be preserved
      const userMessages = result.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(3);
      
      // Messages should be in original order
      let lastIndex = -1;
      for (const msg of result) {
        const originalIndex = messages.indexOf(msg);
        expect(originalIndex).toBeGreaterThan(lastIndex);
        lastIndex = originalIndex;
      }
    });

    it('should respect custom token limits', () => {
      const messages = [
        createMessage('user', 'a'.repeat(40)), // ~10 tokens
        createMessage('assistant', 'a'.repeat(40)), // ~10 tokens
        createMessage('user', 'a'.repeat(40)) // ~10 tokens
      ];
      
      const result = trimHistory(messages, 25);
      
      // Should fit within the custom limit
      expect(contextTokenCount(result)).toBeLessThanOrEqual(25);
      
      // Should still preserve user messages
      const userMessages = result.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(2); // Both user messages should fit
    });

    it('should handle edge case with only assistant messages', () => {
      const messages = [
        createMessage('assistant', 'response1'),
        createMessage('assistant', 'response2'),
        createMessage('assistant', 'response3')
      ];
      
      const result = trimHistory(messages, 50);
      
      // Should keep the first message and newer ones that fit
      expect(result[0]).toEqual(messages[0]);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle very restrictive token limits', () => {
      const messages = [
        createMessage('user', 'a'.repeat(100)), // ~25 tokens
        createMessage('assistant', 'a'.repeat(100)), // ~25 tokens
        createMessage('user', 'a'.repeat(100)) // ~25 tokens
      ];
      
      const result = trimHistory(messages, 30);
      
      // Should at least keep the first message
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(messages[0]);
    });

    it('should maintain message order after trimming', () => {
      const messages = [
        createMessage('user', 'msg1'),
        createMessage('assistant', 'msg2'),
        createMessage('user', 'msg3'),
        createMessage('assistant', 'msg4'),
        createMessage('user', 'msg5'),
        createMessage('assistant', 'msg6')
      ];
      
      const result = trimHistory(messages, 100);
      
      // Verify order is maintained
      for (let i = 1; i < result.length; i++) {
        const currentIndex = messages.indexOf(result[i]);
        const previousIndex = messages.indexOf(result[i - 1]);
        expect(currentIndex).toBeGreaterThan(previousIndex);
      }
    });

    it('should handle empty messages array', () => {
      const result = trimHistory([], 1000);
      expect(result).toEqual([]);
    });

    it('should handle single message', () => {
      const messages = [createMessage('user', 'single message')];
      const result = trimHistory(messages, 1000);
      expect(result).toEqual(messages);
    });

    it('should use default max tokens when not specified', () => {
      // Create messages that will definitely exceed the default limit
      const messages = Array.from({ length: 1000 }, (_, i) => 
        createMessage(i % 2 === 0 ? 'user' : 'assistant', `This is a longer message ${i} with substantial content that will accumulate to exceed the default token limit`)
      );
      
      const result = trimHistory(messages); // No maxTokens specified
      
      // Should significantly reduce the number of messages
      expect(result.length).toBeLessThan(messages.length);
      
      // Should be reasonably close to the default limit (allowing for user message preservation)
      const resultTokens = contextTokenCount(result);
      expect(resultTokens).toBeLessThan(15000); // Allow some buffer for user message preservation
      
      // Should preserve all user messages
      const originalUserMessages = messages.filter(m => m.role === 'user');
      const resultUserMessages = result.filter(m => m.role === 'user');
      expect(resultUserMessages.length).toBe(originalUserMessages.length);
    });

    it('should handle messages with very long content', () => {
      const messages = [
        createMessage('user', 'a'.repeat(10000)), // Very long user message
        createMessage('assistant', 'short'),
        createMessage('user', 'another user message')
      ];
      
      const result = trimHistory(messages, 1000);
      
      // Should preserve user messages even if they're long
      const userMessages = result.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(2);
    });

    it('should handle alternating user/assistant pattern', () => {
      const messages = [
        createMessage('user', 'user1'),
        createMessage('assistant', 'assistant1'),
        createMessage('user', 'user2'),
        createMessage('assistant', 'assistant2'),
        createMessage('user', 'user3'),
        createMessage('assistant', 'assistant3')
      ];
      
      const result = trimHistory(messages, 50);
      
      // All user messages should be preserved
      const userMessages = result.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(3);
      
      // Should maintain alternating pattern where possible
      expect(result[0].role).toBe('user'); // First message
    });

    it('should handle performance with large message arrays', () => {
      const messages = Array.from({ length: 10000 }, (_, i) => 
        createMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
      );
      
      const startTime = Date.now();
      const result = trimHistory(messages, 1000);
      const endTime = Date.now();
      
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(messages.length);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete token management workflow', () => {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: 'What is the weather like?' },
        { role: 'assistant', content: 'I can help you check the weather. What location are you interested in?' },
        { role: 'user', content: 'San Francisco, CA' },
        { role: 'assistant', content: 'The weather in San Francisco is currently sunny with a temperature of 72°F.' }
      ];
      
      // Calculate initial token count
      const initialTokens = contextTokenCount(messages);
      expect(initialTokens).toBeGreaterThan(0);
      
      // Trim with restrictive limit
      const trimmed = trimHistory(messages, 30);
      const trimmedTokens = contextTokenCount(trimmed);
      
      // Should be under limit and preserve user messages
      expect(trimmedTokens).toBeLessThanOrEqual(30);
      const userMessages = trimmed.filter(m => m.role === 'user');
      expect(userMessages.length).toBeGreaterThan(0);
    });

    it('should handle real-world conversation patterns', () => {
      const conversation: Anthropic.MessageParam[] = [
        { role: 'user', content: 'I need help with my JavaScript code' },
        { role: 'assistant', content: 'I\'d be happy to help! Please share your code and describe the issue you\'re experiencing.' },
        { role: 'user', content: 'Here\'s my code: function test() { console.log("hello"); }' },
        { role: 'assistant', content: 'Your code looks good! The function will log "hello" to the console when called. Is there a specific issue you\'re encountering?' },
        { role: 'user', content: 'How do I call this function?' },
        { role: 'assistant', content: 'To call the function, simply write: test()' },
        { role: 'user', content: 'Thank you!' },
        { role: 'assistant', content: 'You\'re welcome! Feel free to ask if you have more questions.' }
      ];
      
      const originalCount = contextTokenCount(conversation);
      const trimmed = trimHistory(conversation, 100);
      const trimmedCount = contextTokenCount(trimmed);
      
      expect(trimmedCount).toBeLessThanOrEqual(100);
      expect(trimmed.length).toBeLessThanOrEqual(conversation.length);
      
      // Should preserve the conversation flow
      expect(trimmed[0].role).toBe('user'); // First message preserved
      const userMessages = trimmed.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(4); // All user messages preserved
    });
  });
});
