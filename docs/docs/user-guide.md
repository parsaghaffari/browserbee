---
sidebar_position: 3
---

# User Guide

This guide will help you get started with BrowserBee and show you how to use it effectively for your daily tasks.

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/parsaghaffari/browserbee.git
   cd browserbee
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the extension
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the `dist` directory
   - The BrowserBee options page should pop up automatically

## Setting Up Your LLM Provider

BrowserBee supports multiple LLM providers. You'll need to set up at least one to use the extension:

### Anthropic Claude

1. Get an API key from [Anthropic](https://console.anthropic.com/)
2. In the BrowserBee options page, select "Anthropic" as your provider
3. Enter your API key in the field provided
4. Select your preferred Claude model (e.g., Claude 3 Opus, Claude 3 Sonnet)

### OpenAI

1. Get an API key from [OpenAI](https://platform.openai.com/account/api-keys)
2. In the BrowserBee options page, select "OpenAI" as your provider
3. Enter your API key in the field provided
4. Select your preferred model (e.g., GPT-4o)

### Google Gemini

1. Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. In the BrowserBee options page, select "Gemini" as your provider
3. Enter your API key in the field provided
4. Select your preferred Gemini model

### Ollama (Local Models)

1. Install [Ollama](https://ollama.ai/) on your computer
2. Start the Ollama server with CORS enabled:
   ```bash
   OLLAMA_ORIGINS=chrome-extension://YOUR_EXTENSION_ID ollama serve
   ```
3. In the BrowserBee options page, select "Ollama" as your provider
4. Enter the Ollama server URL (usually `http://localhost:11434`)
5. Select your preferred model (e.g., llama3.1, qwen3)

## Using BrowserBee

### Opening the Side Panel

1. Click the BrowserBee icon in your Chrome toolbar
2. The side panel will open on the right side of your browser window

### Your First Command

1. Type a natural language instruction in the input field at the bottom of the side panel
2. Press Enter or click the Send button
3. Watch as BrowserBee carries out your instruction

Example commands:
- "Go to Google and search for 'browser automation tools'"
- "Find the latest news about artificial intelligence"
- "Check my Gmail inbox and summarize the unread messages"
- "Go to Twitter and show me the trending topics"

### Understanding the Interface

The BrowserBee side panel consists of several components:

- **Input Field**: Where you type your instructions
- **Message History**: Shows the conversation between you and BrowserBee
- **Token Usage**: Displays the number of tokens used and the estimated cost
- **Tab Status**: Shows which tab BrowserBee is currently controlling

### Approving Actions

For certain sensitive actions (like making purchases or posting on social media), BrowserBee will ask for your explicit approval:

1. BrowserBee will display an approval dialog
2. Review the action it wants to take
3. Click "Approve" to allow the action or "Deny" to prevent it

## Common Tasks

### Web Research

BrowserBee excels at gathering information from multiple sources:

```
Go to Google and search for recent developments in quantum computing. Visit the top 3 results and summarize the key points from each site.
```

### Social Media Management

BrowserBee can help you manage your social media presence:

```
Go to Twitter, check my notifications, and summarize any mentions or replies I've received in the past 24 hours.
```

### Online Shopping

BrowserBee can assist with finding products and comparing prices:

```
Search for wireless noise-canceling headphones on Amazon, find the top 5 options under $200, and compare their features and ratings.
```

### Email Management

BrowserBee can help you manage your email:

```
Go to Gmail, find all unread emails from the last week, and create a summary of each one.
```

## Tips and Tricks

### Be Specific

The more specific your instructions, the better BrowserBee can help you:

- Instead of: "Find flights"
- Try: "Go to Kayak and find flights from New York to London for next weekend, prioritizing morning departures"

### Use Step-by-Step Instructions

For complex tasks, break them down into steps:

```
First, go to my Google Drive. Then, find the folder named "Work Projects". Next, create a new Google Doc titled "Project Plan". Finally, type "# Project Plan" as a heading.
```

### Leverage Memory

BrowserBee remembers previous interactions with websites, making repeat tasks more efficient:

```
Go to my company's HR portal and submit my timesheet for this week, just like I did last week.
```

## Troubleshooting

### BrowserBee Can't Access a Website

- Make sure you're logged in to the website if it requires authentication
- Check if the website has anti-bot measures that might be blocking BrowserBee
- Try refreshing the page and trying again

### Commands Not Working as Expected

- Be more specific in your instructions
- Break complex tasks into smaller steps
- Check if the website's layout has changed since your last visit

### High Token Usage

- Use more concise instructions
- For repetitive tasks, create memories to reduce token usage
- Consider switching to a more cost-effective LLM provider

## Privacy and Security

BrowserBee is designed with privacy in mind:

- Your data stays in your browser (except for what's sent to the LLM provider)
- API keys are stored locally in your browser
- BrowserBee can't access your browser history or other sensitive information unless you explicitly instruct it to

However, be aware that:

- Text sent to LLM providers is subject to their privacy policies
- Be cautious when asking BrowserBee to interact with sensitive websites like banking portals
