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
-- [ ] fix "frame detatched" error when a user reloads the extension without properly closing it/debug session first
- [x] add token counter
- [x] context summarization
- [x] code robustness and refactoring
- [x] hygiene and marketing (readme, license, acknowledgements)
- [x] marketing videos
- [x] llm adaptors (config in options, show active LLM)
- [ ] add saved prompts with persistence in local DB
- [ ] max llm calls: allow user to configure, ask for user permission to exceed

later:
- [ ] session replay feature
- [x] task memory using indexedDB (<website, task, steps, outcome>) 
-- [x] investigate how duplicate memories could affect agent performance, and come up with a solution to handle them if necessary
-- [x] ensure memories are stored/retrieved using canonical URLs (instagram.com vs www.instagram.com)
-- [ ] include pre-built memories for major websites
- [ ] scheduler for recurring tasks using chrome.alarms
