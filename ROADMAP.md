friends launch:
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

HN launch:
- [ ] write tests 
- [x] add "requires approval" flag to irreversible tools, and seek explicit approval from user
- [ ] better handling of multiple Chrome windows
- [x] add token counter
- [x] context summarization
- [x] code robustness and refactoring
- [x] hygiene and marketing (readme, license, acknowledgements)
- [x] marketing videos
- [ ] llm adaptors (config in options, show active LLM)
- [ ] add sessions (similar to Cline tasks) with persistence in local DB
- [ ] max llm calls: allow user to configure, ask for user permission to exceed

later:
- [ ] session replay feature
- [ ] task emory using indexedDB (<website, task, steps, outcome>)
- [ ] scheduler for recurring tasks using chrome.alarms
