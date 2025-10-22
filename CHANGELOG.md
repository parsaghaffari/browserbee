# Changelog

All notable changes to BrowserBee will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-10-22

### 🤖 Added - AI Models & Providers

- **Claude 4.5 Series Support**: Added Claude Sonnet 4.5, Claude Haiku 4.5, and Claude Opus 4.1 models
  - Enhanced extended thinking capabilities for all Claude 4+ models
  - Updated pricing and token limits (64K output for Sonnet/Haiku 4.5, 32K for Opus 4.1)
  - Set Claude Sonnet 4.5 as new default model
- **GPT-5 Series Support**: Added GPT-5, GPT-5 Mini, and GPT-5 Nano models
  - Full reasoning model support with enhanced capabilities
  - Updated OpenAI provider to handle new model features
- **OpenAI-Compatible Provider**: Added support for custom OpenAI-compatible API endpoints
  - Flexible configuration for third-party providers
  - Enhanced model management capabilities

### 🛠️ Added - Development & Testing Infrastructure

- **Comprehensive Test Suite**: Implemented extensive unit testing foundation
  - Agent component tests (AgentCore, MemoryManager, TokenManager, ToolManager, etc.)
  - Tool system tests (interaction, navigation, memory, keyboard, mouse tools)
  - Background service tests (configManager)
  - Model provider tests (factory tests)
  - Test coverage reporting and watch mode
- **CI/CD Pipeline**: Added complete continuous integration and deployment setup
  - Automated testing on pull requests
  - Build verification and deployment processes
  - Enhanced development workflow documentation
- **Hot Module Reload**: Enhanced development experience
  - Improved static file management
  - Fixed development server issues
  - Better build optimization

### 🎨 Added - UI/UX Improvements

- **Options Page Redesign**: Complete overhaul of the options interface
  - Implemented VerticalTabs component for better organization
  - Added Getting Started guide and support section
  - Modular component architecture for better maintainability
  - Enhanced user experience with cleaner layout
- **Enhanced Model Management**: Improved model selection and configuration
  - Better pricing display and comparison
  - Enhanced provider-specific settings
  - Improved model list management

### 🔧 Enhanced - Provider Support

- **Ollama Provider Enhancements**: 
  - Custom model management capabilities
  - Enhanced settings and configuration options
  - Better integration with local models
- **Anthropic Provider Updates**:
  - Extended thinking support for Claude 4+ models
  - Improved reasoning logic and token handling
  - Enhanced cache management
- **OpenAI Provider Improvements**:
  - Reasoning model support for GPT-5 series
  - Better error handling and response processing
  - Enhanced model capability detection

### 📚 Added - Documentation & Community

- **Chrome Web Store Availability**: Updated documentation to reflect store presence
- **Discord Community Integration**: Added Discord server links and community support
- **Enhanced Documentation**:
  - Updated CONTRIBUTING.md with testing guidelines
  - Improved architecture documentation
  - Better user guides and setup instructions
  - CI/CD process documentation

### 🐛 Fixed

- **Model Naming Consistency**: Corrected Claude model naming for better consistency
- **Development Setup Issues**: Fixed npm run dev failures and missing dependencies
- **ESLint Integration**: Added code quality improvements and linting rules
- **Pricing Adjustments**: Corrected o3 model pricing in OpenAI models
- **Build Process**: Fixed various build and development server issues

### 🔄 Changed

- **Default Model**: Changed from Claude 3.7 Sonnet to Claude Sonnet 4.5
- **Architecture**: Refactored Options.tsx into modular components
- **Testing Strategy**: Moved from ad-hoc testing to comprehensive test suite
- **Development Workflow**: Enhanced with hot reloading and better tooling

### 📦 Dependencies

- Updated @anthropic-ai/sdk to support new Claude models
- Enhanced OpenAI SDK integration for GPT-5 series
- Added comprehensive testing dependencies (Jest, Testing Library)
- Updated build tools and development dependencies

---

## [0.2.0-beta] - Previous Release

Initial beta release with core browser automation functionality.

### Features
- Basic browser automation with natural language
- Claude 3.x model support
- Chrome extension architecture
- Side panel interface
- Options configuration page

---

## Release Notes

### 🚀 What's New in v0.2.0

This release represents a major evolution of BrowserBee with significant improvements across AI capabilities, developer experience, and user interface design.

**Key Highlights:**
- **Next-Generation AI Models**: Support for the latest Claude 4.5 and GPT-5 series models with enhanced reasoning capabilities
- **Robust Testing Infrastructure**: Comprehensive test suite ensuring reliability and maintainability
- **Modern Development Experience**: Hot reloading, CI/CD pipeline, and enhanced tooling
- **Redesigned Interface**: Clean, organized options page with better user experience
- **Expanded Provider Ecosystem**: Support for custom OpenAI-compatible APIs and enhanced Ollama integration

### 🎯 For Users
- **Better AI Performance**: Latest models provide more accurate and capable browser automation
- **Improved Interface**: Cleaner, more intuitive options and configuration pages
- **Enhanced Reliability**: Comprehensive testing ensures more stable operation
- **Broader Model Support**: More choice in AI providers and models

### 🛠️ For Developers
- **Test-Driven Development**: Full test suite with coverage reporting
- **Modern Tooling**: ESLint, hot reloading, and automated CI/CD
- **Better Architecture**: Modular components and improved code organization
- **Comprehensive Documentation**: Enhanced guides and contribution instructions

### 📈 Statistics
- **30+ commits** since v0.2.0-beta
- **5 new AI models** added (Claude 4.5 series + GPT-5 series)
- **100+ unit tests** implemented
- **3 new provider integrations** (OpenAI-compatible, enhanced Ollama)
- **Complete UI redesign** with modular architecture

This release establishes BrowserBee as a mature, well-tested platform for browser automation with cutting-edge AI capabilities.
