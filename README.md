# BrowserBee 🐝
*Your AI-powered browser automation assistant. Control the web with natural language.*
 
https://github.com/user-attachments/assets/0c9e870a-64b9-4c3a-b805-cfede39bb00a

BrowserBee is a privacy-first open source Chrome extension that lets you control your browser using natural language. It combines the power of an LLM for instruction parsing & planning, and Playwright for robust browser automation.

Since BrowserBee runs entirely within your browser (with the exception of the LLM), it can interact with logged-in websites, like your social media accounts or email, without compromising security or requiring backend infrastructure. This makes it more convenient for personal use than other "browser use" type products out there.

## 🎲 Features 

- Supports major LLM providers such as **Anthropic**, **OpenAI**, **Gemini**, and **Ollama** with more coming soon
- Tracks **token use** and **price** so you know how much you're spending on each task
- Has access to a wide range of **🕹️ browser tools** (listed below) for interacting and understanding browser state
- Uses **Playwright** in the background which is a robust browser automation tool
- The **memory** feature captures useful tool use sequences and stores them locally to make future use more efficient
- The agent knows when to ask for user's **approval**, e.g. for purchases or posting updates on social media

## 🕹️ Supported tools

<details>
<summary><b>Navigation Tools</b></summary>

- **browser_navigate**
  - Navigate the browser to a specific URL. Input must be a full URL, e.g. https://example.com

- **browser_wait_for_navigation**
  - Wait until network is idle (Playwright).

- **browser_navigate_back**
  - Go back to the previous page (history.back()). No input.

- **browser_navigate_forward**
  - Go forward to the next page (history.forward()). No input.
</details>

<details>
<summary><b>Tab Context Tools</b></summary>

- **browser_get_active_tab**
  - Returns information about the currently active tab, including its index, URL, and title.

- **browser_navigate_tab**
  - Navigate a specific tab to a URL. Input format: 'tabIndex|url' (e.g., '1|https://example.com')

- **browser_screenshot_tab**
  - Take a screenshot of a specific tab by index. Input format: 'tabIndex[,flags]' (e.g., '1,full')
</details>

<details>
<summary><b>Interaction Tools</b></summary>

- **browser_click**
  - Click an element. Input may be a CSS selector or literal text to match on the page.

- **browser_type**
  - Type text. Format: selector|text (e.g. input[name="q"]|hello)

- **browser_handle_dialog**
  - Accept or dismiss the most recent alert/confirm/prompt dialog. Input `accept` or `dismiss`. For prompt dialogs you may append `|text` to supply response text.
</details>

<details>
<summary><b>Observation Tools</b></summary>

- **browser_get_title**
  - Return the current page title.

- **browser_snapshot_dom**
  - Capture DOM snapshot of the current page with options for selector, clean, structure, and limit.

- **browser_query**
  - Return up to 10 outerHTML snippets for a CSS selector you provide.

- **browser_accessible_tree**
  - Return the AX accessibility tree JSON (default: interesting‑only). Input 'all' to dump full tree.

- **browser_read_text**
  - Return all visible text on the page, concatenated in DOM order.

- **browser_screenshot**
  - Take a screenshot of the current page with options for full page capture.
</details>

<details>
<summary><b>Mouse Tools</b></summary>

- **browser_move_mouse**
  - Move the mouse cursor to absolute screen coordinates. Input format: `x|y` (example: `250|380`)

- **browser_click_xy**
  - Left‑click at absolute coordinates. Input format: `x|y` (example: `250|380`)

- **browser_drag**
  - Drag‑and‑drop with the left button. Input format: `startX|startY|endX|endY` (example: `100|200|300|400`)
</details>

<details>
<summary><b>Keyboard Tools</b></summary>

- **browser_press_key**
  - Press a single key. Input is the key name (e.g. `Enter`, `ArrowLeft`, `a`).

- **browser_keyboard_type**
  - Type arbitrary text at the current focus location. Input is the literal text to type. Use `\n` for new lines.
</details>

<details>
<summary><b>Tab Tools</b></summary>

- **browser_tab_list**
  - Return a list of open tabs with their indexes and URLs.

- **browser_tab_new**
  - Open a new tab. Optional input = URL to navigate to (otherwise blank tab).

- **browser_tab_select**
  - Switch focus to a tab by index. Input = integer index from browser_tab_list.

- **browser_tab_close**
  - Close a tab. Input = index to close (defaults to current tab if blank).
</details>

<details>
<summary><b>Memory Tools</b></summary>

- **save_memory**
  - Save a memory of how to accomplish a specific task on a website. Use this when you want to remember a useful sequence of actions for future reference.

- **lookup_memories**
  - Look up stored memories for a specific website domain. Use this as your FIRST step when starting a task on a website to check if there are any saved patterns you can reuse.

- **get_all_memories**
  - Retrieve all stored memories across all domains. Use this when you want to see all available memories.

- **delete_memory**
  - Delete a specific memory by its ID. Use this when a memory is no longer useful or accurate.

- **clear_all_memories**
  - Clear all stored memories. Use this with caution as it will delete all memories across all domains.
</details>

## ✅ Use Cases

- **Social media butler**: Checks your social media accounts, summarizes notifications and messages, and helps you respond.
- **News curator**: Gathers and summarizes the latest headlines from your preferred news sources and blogs, giving you a quick, personalized briefing.
- **Personal assistant**: Helps with everyday tasks like reading and sending emails and messages, booking flights, finding products, and more.
- **Research assistant**: Assists with deep dives into topics like companies, job listings, market trends, and academic publications by gathering and organizing information.
- **Knowledge bookmarking & summarization**: Quickly summarizes articles, extracts key information, and saves useful insights for later reference.
- **Chat with any website**: Ask questions, generate summaries, fill out forms, etc.

## 🛫 Roadmap

Please refer to [ROADMAP.md](ROADMAP.md) for an up to date list of features we're aiming to add to BrowserBee. 

- Support for saving and replaying sessions (macros)
- Ability to memorize key information as needed (in your local Chrome instance using [IndexedDB](https://developer.chrome.com/docs/devtools/storage/indexeddb))
- Scheduled task execution (e.g. check news and social media every morning)

If you're interested in contributing to build any of these features or to improve BrowserBee in any way, please head over to [CONTRIBUTING.md](CONTRIBUTING.md).

## ▶️ Installation

1. Clone this repository
2. Install dependencies with `npm install` or `pnpm install` (this takes ~3 minutes)
3. Build the extension with `npm run build` or `pnpm build`
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory
   - Set your LLM API key(s) for Anthropic, OpenAI, Gemini, and/or configure Ollama in the options page that pops up

## 🏃‍♂️ Usage

1. Click the BrowserBee icon in your Chrome toolbar, or press *Alt+Shift+B*, to open the side panel  
2. Type your instruction (e.g., *"Go to Google, search for Cicero, and click the first result"*)  
3. Hit Enter and watch BrowserBee go to work 🐝

## 🫂 Acknowledgements

BrowserBee is built using these amazing open source projects:

- [Cline](https://github.com/cline/cline) enabled us to vibe-code the first version of BrowserBee and inspired me to build a "Cline for the web"
- [playwright-crx](https://github.com/ruifigueira/playwright-crx) by [@ruifigueira](https://github.com/ruifigueira) for in-browser use of Playwright
- [playwright-mcp](https://github.com/microsoft/playwright-mcp) for the browser tool implementations
- [daisyUI](https://daisyui.com/) 🌼 for the ~~pollen and nectar~~ UI components :)

## 💡 Learnings & what's worth stealing

1. **Running Playwright in the browser.** Playwright provides a robust and standard interface to LLMs for interacting with modern websites and web apps. Most "browser use" approaches I've come across like [Browser Use](https://github.com/browser-use) and [Playwright MCP](https://github.com/microsoft/playwright-mcp) are primarily designed for controlling a browser remotely in a backend service-browser fashion which is powerful for enterprise automations, whereas [@ruifigueira](https://github.com/ruifigueira) has shown we can neatly wrap Playwright with a browser extension and reduce complexity for end-user use cases.
2. **"Reflect and learn" memory pattern.** Certain setups are rich in feedback for AI agents. This is one of them, where the agent not only has a broad range of tools available to interact with the environment, but also has powerful observation abilities to understand the impact of its actions on the environment. For example, if the agent is tasked with completing a product purchase, where there is a good chance it's able to brute force its way to the end goal by using different tools (such as mouse and keyboard interactions), it can usually tell whether it has succeeded in the task or not by regularly taking screenshots. There is a valuable learning signal here for the agent and by invoking the agent to encode and memorise these learnings we can enhance future performance and increase efficiency on similar tasks, especially for smaller less capable models. In my limited testing, we can sometimes reduce the number of tokens needed (and therefore cost) for a task by 5x or more if we memorize the optimal tool sequence.
3. **Interacting with web pages remains a hard task for LLM-powered agents.** DOMs and screenshots are complex, low-information-density modalities that are slow, expensive, and challenging to process for LLMs. Compare a web page to a piece code for instance: each token in a piece of code carries a lot more information on average than a token in an HTML page or pixels in a screenshot. Therefore we need a combination of cleverly simplified representations as well as cheaper/faster models for this type of product to become fully feasible.
4. **Why use an LLM at all?**. The core value that an LLM agent can provide in this context is in _discovering_ a path or a sequence of actions to accomplish a task which can then be encoded as a set of tool calls, or in fact plain JavaScript (see [Playwright Codegen](https://playwright.dev/docs/codegen)); once a sequence is already known, it's trivial to follow - no LLM needed.
5. **Privacy-first personal AI tools are the way to go.** There is no doubt that most of us will have some form of an always-on AI servant in the future, and I think the only way we can get there safely is through open source software that interacts transparently with our data and with LLMs. There is a lot of scope for building this type of software, and business models to support it (e.g. offering a hosted version), so I really hope to see and use more robust open source AI assistants.

## 📜 License

[Apache 2.0](LICENSE)