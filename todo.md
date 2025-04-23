friends launch:
- [x] render markdown in output
- [x] add streaming output
- [x] add button to clear context (otherwise continue with previous context)
- [x] tab management for deciding which tab to control
- [x] open options.html on install
- [x] prompt improvements e.g. to stop preempting what we're going to see when navigating to a website
- [ ] put on github
- [x] better llm rate limit handling
- [x] decide name, add icon
- [x] fix screenshot issue (screenshots are mostly useless right now)
- [x] make prompt input elastic, and remove resizer

HN launch:
- [ ] add token counter
- [ ] context summarization
- [ ] code robustness and refactoring
- [ ] hygiene and marketing (readme, license, videos, acknowledgements (Cline, playwright-crx, playwright-mcp))
- [ ] llm adaptors (config in options, show active LLM)
- [ ] add sessions (similar to Cline tasks) with persistence in local DB
- [ ] max llm calls: allow user to configure, ask for user permission to exceed

later:
- [ ] session replay feature
- [ ] memory using indexedDB (<website, task, steps, outcome>)
- [ ] scheduler using chrome.alarms