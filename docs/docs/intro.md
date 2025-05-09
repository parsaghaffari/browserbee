---
sidebar_position: 1
---

# Introduction to BrowserBee

Welcome to the BrowserBee documentation! This guide will help you understand what BrowserBee is, how to install it, and how to use it effectively.

## What is BrowserBee?

BrowserBee is a privacy-first open source Chrome extension that lets you control your browser using natural language. It combines the power of an LLM for instruction parsing and Playwright for robust browser automation.

Since BrowserBee runs entirely within your browser (with the exception of the LLM), it can interact with logged-in websites, like your social media accounts or email, without compromising security or requiring backend infrastructure. This makes it more convenient for personal use than other "browser use" type products out there.

## Key Features

- **Natural Language Control**: Control your browser with simple, natural language commands
- **Multiple LLM Support**: Works with major LLM providers such as **Anthropic**, **OpenAI**, and **Gemini**, with more coming soon
- **Token Tracking**: Tracks **token use** and **price** so you know how much you're spending on each task
- **Browser Tools**: Has access to a wide range of browser tools for interacting and understanding browser state
- **Playwright Integration**: Uses **Playwright** in the background which is a robust browser automation tool
- **Memory Feature**: Captures useful tool use sequences and stores them locally to make future use more efficient
- **User Approval**: The agent knows when to ask for user's approval, e.g. for purchases or posting updates on social media

## Use Cases

- **Social media butler**: Checks your social media accounts, summarizes notifications and messages, and helps you respond.
- **News curator**: Gathers and summarizes the latest headlines from your preferred news sources and blogs, giving you a quick, personalized briefing.
- **Personal assistant**: Helps with everyday tasks like reading and sending emails and messages, booking flights, finding products, and more.
- **Research assistant**: Assists with deep dives into topics like companies, job listings, market trends, and academic publications by gathering and organizing information.
- **Knowledge bookmarking & summarization**: Quickly summarizes articles, extracts key information, and saves useful insights for later reference.

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
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory
   - Set your LLM API key(s) for Anthropic, OpenAI, Gemini, and/or configure Ollama in the options page that pops up

## Basic Usage

1. Click the BrowserBee icon in your Chrome toolbar to open the side panel
2. Type your instruction (e.g., *"Go to Google, search for Cicero, and click the first result"*)
3. Hit Enter and watch BrowserBee go to work 🐝

## Next Steps

- Check out the [Architecture](./architecture.md) to understand how BrowserBee works
- Read the [User Guide](./user-guide.md) to learn how to use BrowserBee effectively
- Read the [Contributing Guide](./contributing.md) if you want to contribute to the project
