---
sidebar_position: 2
---

# Architecture

This document provides a detailed overview of BrowserBee's architecture, component structure, and code organization.

## Overview

BrowserBee uses a modular agent architecture with four key modules:

- **Agent Module** – Processes user instructions and maps them to browser actions
- **Background Module** – Manages tab control, messaging, and task streaming
- **UI Module** – Provides a clean sidebar interface for interaction and configuration
- **Models Module** – Provides a flexible interface for multiple LLM providers

## Detailed Architecture

### Models Module

The Models Module provides a flexible interface for multiple LLM providers:

- **models/providers/types.ts**: Common interfaces for all providers
  - `ModelInfo`: Information about a model (name, pricing, etc.)
  - `ProviderOptions`: Configuration options for a provider
  - `StreamChunk`: Common format for streaming responses
  - `LLMProvider`: Interface that all providers must implement

- **models/providers/factory.ts**: Factory function to create providers
  - Creates the appropriate provider based on configuration

- **models/providers/anthropic.ts**: Anthropic Claude provider implementation
  - Handles Claude-specific streaming and features
  - Supports Claude's thinking feature

- **models/providers/openai.ts**: OpenAI GPT provider implementation
  - Handles OpenAI-specific streaming and features

- **models/providers/gemini.ts**: Google Gemini provider implementation
  - Handles Gemini-specific streaming and features

- **models/providers/ollama.ts**: Ollama provider implementation
  - Connects to locally running Ollama models
  - Uses browser-compatible version of the Ollama library
  - Supports streaming responses from local models

- **models/providers/ollama-format.ts**: Ollama message format transformer
  - Converts between Anthropic and Ollama message formats
  - Handles complex message structures with tools and images

### Agent Module

The Agent Module is responsible for processing user instructions and executing browser automation tasks. It consists of a few sub-modules:

- **agent/AgentCore.ts**: Main agent class that coordinates all components
  - Uses the provider factory to create the appropriate LLM provider
  - Configurable with different LLM providers
- **agent/TokenManager.ts**: Token estimation and message history trimming
- **agent/ToolManager.ts**: Tool wrapping with health checks
- **agent/PromptManager.ts**: System prompt generation
- **agent/MemoryManager.ts**: Memory lookup and integration
- **agent/ErrorHandler.ts**: Cancellation and error handling
- **agent/ExecutionEngine.ts**: Streaming and non-streaming execution
  - Provider-agnostic implementation that works with any LLM provider
- **agent/approvalManager.ts**: Handles user approval for sensitive actions

- **agent/tools/**: Browser automation tools organized by functionality
  - **navigationTools.ts**: Browser navigation functions (go to URL, back, forward, refresh)
  - **interactionTools.ts**: User interaction functions (click, type, scroll)
  - **observationTools.ts**: Page observation functions (screenshot, DOM access, content extraction)
  - **mouseTools.ts**: Mouse movement and interaction (move, hover, drag)
  - **keyboardTools.ts**: Keyboard input functions (press keys, keyboard shortcuts)
  - **tabTools.ts**: Tab management functions (create, switch, close tabs)
  - **memoryTools.ts**: Memory storage and retrieval functions
  - **types.ts**: Type definitions for tools
  - **utils.ts**: Utility functions for tools
  - **index.ts**: Tool exports and registration

### Background Module

The Background Module manages the extension's background processes, including tab control and communication.

- **background/index.ts**: Entry point for the background script
- **background/tabManager.ts**: Tab attachment and management
  - Handles connecting to tabs
  - Manages tab state and lifecycle
  - Coordinates tab interactions
- **background/agentController.ts**: Agent initialization and execution
  - Creates and configures the agent
  - Processes user instructions
  - Manages agent execution flow
- **background/streamingManager.ts**: Streaming functionality
  - Handles streaming of agent responses
  - Manages segmentation of responses
  - Controls streaming state
- **background/messageHandler.ts**: Message routing and handling
  - Processes messages between components
  - Routes messages to appropriate handlers
  - Manages message queue
- **background/configManager.ts**: Provider configuration management
  - Stores and retrieves provider configuration
  - Provides a singleton instance for global access
- **background/types.ts**: Type definitions for background processes
- **background/utils.ts**: Utility functions for background processes

### UI Module

The UI Module provides the user interface for interacting with the extension.

#### Side Panel

The Side Panel is the main interface for interacting with BrowserBee. It has been refactored into a modular component structure:

- **sidepanel/SidePanel.tsx**: Main component that orchestrates the UI
  - Composes all UI components
  - Coordinates state and functionality through hooks
  - Manages overall layout and structure

- **sidepanel/types.ts**: Type definitions for the side panel
  - Message types and interfaces
  - Chrome message interfaces
  - Other shared types

- **sidepanel/components/**: Modular UI components
  - **LlmContent.tsx**: Renders LLM content with tool calls
    - Processes and displays markdown content
    - Handles special formatting for tool calls
    - Applies styling to different content elements
  - **ScreenshotMessage.tsx**: Renders screenshot images
    - Displays base64-encoded screenshots
    - Handles image formatting and sizing
  - **MessageDisplay.tsx**: Handles rendering of different message types
    - Manages message filtering
    - Coordinates rendering of system, LLM, and screenshot messages
    - Handles streaming segments
  - **OutputHeader.tsx**: Manages the output section header with toggle controls
    - Provides controls for clearing history
    - Manages system message visibility toggle
  - **PromptForm.tsx**: Handles the input form and submission
    - Manages prompt input
    - Handles form submission
    - Provides cancel functionality during processing
  - **TabStatusBar.tsx**: Displays the current tab information
    - Shows active tab ID and title
    - Indicates connection status
  - **TokenUsageDisplay.tsx**: Displays token usage and provider information
    - Shows current LLM provider and model
    - Tracks input and output tokens
    - Displays estimated cost

- **sidepanel/hooks/**: Custom React hooks for state and functionality
  - **useTabManagement.ts**: Manages tab-related functionality
    - Handles tab connection
    - Tracks tab state
    - Updates tab information
  - **useMessageManagement.ts**: Handles message state and processing
    - Manages message history
    - Controls streaming state
    - Provides message manipulation functions
  - **useChromeMessaging.ts**: Manages communication with the Chrome extension API
    - Listens for Chrome messages
    - Sends messages to background script
    - Handles message processing

#### Options Page

- **options/Options.tsx**: Options page for configuring the extension
  - Provider selection (Anthropic, OpenAI, Gemini, Ollama)
  - API key management for each provider
  - Model selection for each provider
  - Advanced configuration options
- **options/index.tsx**: Entry point for the options page

### Tracking Module

The Tracking Module handles memory storage, token tracking, and other tracking-related functionality.

- **tracking/memoryService.ts**: Manages storage and retrieval of agent memories
  - Handles IndexedDB operations
  - Provides memory storage and retrieval
  - Includes self-healing database functionality
- **tracking/tokenTrackingService.ts**: Tracks token usage for API calls
- **tracking/screenshotManager.ts**: Manages screenshot storage and retrieval
- **tracking/domainUtils.ts**: Utilities for working with domains

## Data Flow

1. User enters a prompt in the Side Panel
2. The prompt is sent to the Background Module
3. The Background Module initializes the Agent with the configured LLM provider
4. The Agent processes the prompt and executes browser actions:
   - TokenManager handles token estimation and history trimming
   - PromptManager generates the system prompt
   - ExecutionEngine manages the execution flow
   - ToolManager provides access to browser tools
   - MemoryManager integrates relevant memories
   - ErrorHandler manages error conditions
5. Results are streamed back to the Side Panel
6. The Side Panel displays the results to the user

## Component Relationships

- The Side Panel communicates with the Background Module through Chrome messaging
- The Background Module manages the Agent and coordinates its actions
- The Agent Core coordinates the specialized components (TokenManager, ToolManager, etc.)
- Each specialized component handles a specific aspect of the agent's functionality
- The Agent uses tools to interact with the browser
- The Tracking Module provides persistence and monitoring services
- The Options Page configures the extension settings used by the Background Module
- The Models Module provides a flexible interface for multiple LLM providers

## Provider System

## Ollama Integration

The Ollama integration allows users to connect to locally running Ollama models:

1. **Browser Compatibility**: Uses the browser-compatible version of the Ollama library
2. **API Key Optional**: Unlike other providers, Ollama doesn't require an API key
3. **CORS Configuration**: Requires CORS to be enabled on the Ollama server
4. **Local Models**: Supports models like llama3.1 and Qwen3
5. **Privacy-Focused**: Provides a privacy-focused alternative to cloud-based LLM providers

The provider system follows these design patterns:

1. **Interface Segregation**: Each provider implements a common interface
2. **Factory Pattern**: A factory function creates the appropriate provider
3. **Adapter Pattern**: Each provider adapts its specific API to the common interface
4. **Strategy Pattern**: Different providers can be swapped at runtime
5. **Singleton Pattern**: The ConfigManager provides a single point of access to configuration

## File Organization

The project follows a modular structure with clear separation of concerns:

- Each module has its own directory
- Components are organized by functionality
- Types are defined close to where they are used
- Hooks encapsulate related state and functionality
- Utility functions are separated into dedicated files

## Design Principles

1. **Separation of Concerns**: Each component and module has a single responsibility
2. **Modularity**: Components and modules can be developed and tested independently
3. **Reusability**: Common functionality is extracted into reusable components and hooks
4. **Type Safety**: TypeScript is used throughout the project for type safety
5. **Maintainability**: Code is organized to be easy to understand and maintain
6. **Resilience**: Self-healing mechanisms are implemented for critical components
7. **Lifecycle Management**: Extension installation, updates, and uninstallation are properly handled
8. **Provider Abstraction**: LLM providers are abstracted behind a common interface
