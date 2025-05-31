[0.1.0]
- [x] render markdown in output
- [x] add streaming output
- [x] add button to clear context (otherwise continue with previous context)
- [x] tab management for deciding which tab to control
- [x] open options.html on install
- [x] prompt improvements e.g. to stop preempting what we're going to see when navigating to a website
- [x] better llm rate limit handling
- [x] decide name, add icon
- [x] fix screenshot issue (screenshots are mostly useless right now)
- [x] make prompt input elastic, and remove resizer
- [x] better handling of when user cancels the debugging session
- [x] put on github

[0.2.0]
- [x] add "requires approval" flag to irreversible tools, and seek explicit approval from user
- [x] better handling of multiple Chrome windows
-- [x] fix "frame detatched" error when a user reloads the extension without properly closing it/debug session first
-- [x] bug: approval dialog now appears in all windows
- [x] add token counter
- [x] context summarization
- [x] code robustness and refactoring
- [x] hygiene and marketing (readme, license, acknowledgements)
- [x] marketing videos
- [x] llm adaptors (config in options, show active LLM)
    - [x] automatically refresh model list upon change in configuration
- [x] add integration with Ollama
- [x] task memory using indexedDB (<website, task, steps>) 
    - [x] investigate how duplicate memories could affect agent performance, and come up with a solution to handle them if necessary
    - [x] add memory import/export functions
    - [x] include pre-built memories for major websites
    - [x] ensure memories are stored/retrieved using canonical URLs (instagram.com vs www.instagram.com)
- [x] review/write user docs
- [x] upload to Chrome web store
- [x] create test suite and add basic test coverage

[0.2.1]

- [x] add support for latest Gemini 2.5 Flash & Pro
- [x] add support for OpenAI Compatible models
- [x] add support for Claude 4
- [ ] enhance support for Ollama models
    - [ ] better handling for <think> tokens when using thinking models
    - [x] improve configuration to accept model, max tokens, etc as parameters
- [ ] add memory management UI
    - [ ] view all available memories
    - [ ] delete ones not needed  
    - [ ] sync useful memories with server
- [ ] tab management enhancements
    - [ ] seamlessly follow user's active tab
- [ ] enhanced isolation across windows
    - [ ] token tracker not isolated by window?
- [ ] evaluate puppeteer as an alternative to playwright
- [ ] evaluate optimisation strategies for DOM representations
- [ ] disable prompt input during cancellation process
- [ ] add support for tiered LLM pricing
- [ ] chat UI enhancements

[0.3.0]
- [ ] add saved prompts with persistence in local DB
- [ ] max llm calls: allow user to configure, ask for user permission to exceed
- [ ] scheduler for recurring tasks using chrome.alarms
- [ ] test and enhance prompt caching
- [ ] add user memory component
