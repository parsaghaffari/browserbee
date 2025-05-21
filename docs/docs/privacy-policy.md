---
sidebar_position: 6
title: Privacy Policy
---

# Privacy Policy

*Last Updated: May 20, 2025*

## Introduction

BrowserBee is committed to protecting your privacy. This Privacy Policy explains how information is accessed, used, and stored by the BrowserBee extension when you use it.

BrowserBee is a privacy-first open source Chrome extension that lets you control your browser using natural language. It combines the power of an LLM for instruction parsing & planning, and Playwright for robust browser automation to accomplish tasks.

## Information Accessed by the Extension

### Information You Provide

- **API Keys**: If you choose to use external LLM providers (Anthropic, OpenAI, Gemini), you will need to provide your own API keys. These keys are stored locally in your browser using Chrome's storage API and are only used to make API calls to the respective services.

- **User Instructions**: The natural language instructions you provide to BrowserBee are processed to perform the requested actions.

### Information Accessed During Operation

- **Browser Content**: To perform the actions you request, BrowserBee needs to access the content of the web pages you visit. This includes:
  - DOM content (HTML structure)
  - Text content
  - Visual content (via screenshots)
  - Form inputs
  - Navigation history within the extension session

- **Tool Usage Data**: BrowserBee locally tracks which tools are used during your sessions to improve functionality and provide better assistance in the future.

- **Token Usage**: When using LLM providers, BrowserBee locally tracks token usage to display cost information to you.

## How Information is Used

BrowserBee uses the accessed information for the following purposes:

1. **To Provide and Maintain the Service**: The extension accesses information to perform the actions you request through natural language instructions.

2. **To Improve the Service**: Tool usage data is used locally to improve the functionality of BrowserBee and provide better assistance.

3. **To Store Memories**: BrowserBee stores memories of how to accomplish specific tasks on websites to make future use more efficient. These memories are stored locally in your browser using IndexedDB.

4. **To Communicate with LLM Providers**: When you use external LLM providers, BrowserBee sends your instructions and relevant browser context to these providers to generate appropriate responses and actions.

## Data Storage and Security

### Local Storage

BrowserBee only stores data locally in your browser:

- API keys for LLM providers
- Configuration settings
- Task memories
- Token usage data

This data is stored using Chrome's storage API and IndexedDB, and is not transmitted to any BrowserBee servers.

### Data Transmission

BrowserBee transmits data to third-party services only in the following cases:

- When making API calls to LLM providers (Anthropic, OpenAI, Gemini) if you have configured these providers
- When connecting to a locally running Ollama instance if you have configured this option

In these cases, the data transmitted includes:
- Your instructions
- Relevant browser context (page content, screenshots, etc.) necessary for the LLM to understand and process your request

## Your Choices and Rights

### API Keys

You have full control over which LLM providers you use and can remove your API keys at any time through the options page.

### Local Data

You can clear all locally stored data by:
- Using the "Clear All Memories" tool within BrowserBee
- Clearing your browser's storage for the BrowserBee extension

## Third-Party Services

BrowserBee integrates with the following third-party services:

- **Anthropic Claude**: If configured, BrowserBee sends data to Anthropic to process your instructions.
- **OpenAI**: If configured, BrowserBee sends data to OpenAI to process your instructions.
- **Google Gemini**: If configured, BrowserBee sends data to Google to process your instructions.
- **Ollama**: If configured, BrowserBee sends data to your locally running Ollama instance to process your instructions.
- **OpenAI Compatible**: If configured, BrowserBee sends data to third-party OpenAI compatible provider you've configured to process your instructions.

Each of these services has its own privacy policy that governs how they handle your data. We encourage you to review their privacy policies:

- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy)
- [Google AI Privacy Policy](https://ai.google/policies/privacy/)
- [Ollama Privacy Policy](https://ollama.com/privacy)

## Chrome Permissions

BrowserBee requires several Chrome permissions to function properly:

- **debugger**: Used to establish a connection with browser tabs through Chrome DevTools Protocol (CDP), enabling Playwright-CRX to attach to tabs and control them.

- **tabs**: Used to manage browser tabs (create, close, navigate, switch) and access tab information (URLs, titles).

- **sidePanel**: Used to provide the main user interface as a Chrome side panel.

- **storage**: Used to store configuration settings, task memories, token usage data, and extension state information.

- **activeTab**: Used to interact with the currently active tab to perform actions like clicking elements, typing text, and extracting information.

- **host_permissions** (`<all_urls>`): Used to interact with any website you visit, enabling automation across different domains.

These permissions are used solely for the purpose of providing the core functionality of BrowserBee and are not used to collect or transmit data beyond what is necessary for the operation of the extension.

## Changes to This Privacy Policy

This Privacy Policy may be updated from time to time. Any changes will be posted on the GitHub repository with an updated "Last Updated" date at the top of this policy.

## Contact Us

If you have questions about this Privacy Policy, please open an issue on the [GitHub repository](https://github.com/parsaghaffari/browserbee).

## Your Consent

By using BrowserBee, you consent to this Privacy Policy.
