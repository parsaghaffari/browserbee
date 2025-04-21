friends launch:
- [x] render markdown in output
- [x] add streaming output
- [ ] add button to clear context (otherwise continue with previous context)
- [ ] tab management for deciding which tab to control
- [x] open options.html on install
- [ ] code robustness and refactoring
- [ ] prompt improvements e.g. to stop preempting what we're going to see when navigating to a website
- [ ] put on github
- [x] better llm error handling, e.g.: {"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (2b4f96e0-19a2-4722-ab1c-202e024f5d19) of 40,000 input tokens per minute. For details, refer to: https://docs.anthropic.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."}}
- [ ] decide name, add icon
- [ ] fix screenshot issue

HN launch:
- [ ] hygiene and marketing (readme, license, videos, etc)
- [ ] llm adaptors (config in options, show active LLM)
- [ ] add sessions (similar to Cline tasks) with persistence in local DB
- [ ] max llm calls: allow user to configure, ask for user permission to exceed

later:
- [ ] session replay feature
- [ ] memory using indexedDB (<website, task, steps, outcome>)
- [ ] scheduler using chrome.alarms