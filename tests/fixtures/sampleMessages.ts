import type Anthropic from '@anthropic-ai/sdk';

export const sampleUserMessage: Anthropic.MessageParam = {
  role: 'user',
  content: 'Navigate to Google and search for "test query"',
};

export const sampleAssistantMessage: Anthropic.MessageParam = {
  role: 'assistant',
  content: 'I\'ll help you navigate to Google and search for "test query". Let me start by taking a screenshot to see the current page.',
};

export const sampleToolUseMessage: Anthropic.MessageParam = {
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'I\'ll take a screenshot first to see the current page.',
    },
    {
      type: 'tool_use',
      id: 'tool_1',
      name: 'browser_screenshot',
      input: {},
    },
  ],
};

export const sampleToolResultMessage: Anthropic.MessageParam = {
  role: 'user',
  content: [
    {
      type: 'tool_result',
      tool_use_id: 'tool_1',
      content: 'Screenshot taken successfully',
    },
  ],
};

export const sampleConversationHistory: Anthropic.MessageParam[] = [
  sampleUserMessage,
  sampleAssistantMessage,
  sampleToolUseMessage,
  sampleToolResultMessage,
];

export const complexUserMessage: Anthropic.MessageParam = {
  role: 'user',
  content: 'Go to Amazon, search for "wireless headphones", filter by price under $100, and add the first result to cart',
};

export const memoryLookupMessage: Anthropic.MessageParam = {
  role: 'user',
  content: 'Check my social media notifications and summarize them',
};

export const approvalRequiredMessage: Anthropic.MessageParam = {
  role: 'user',
  content: 'Purchase the item in my cart using my saved payment method',
};

export const errorScenarioMessage: Anthropic.MessageParam = {
  role: 'user',
  content: 'Navigate to https://invalid-url-that-does-not-exist.com',
};

export const multiStepTaskMessage: Anthropic.MessageParam = {
  role: 'user',
  content: 'Book a flight from NYC to LA for next Friday, departing in the morning',
};
