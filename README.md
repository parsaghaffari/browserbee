# BrowserBee 🐝
*Your AI-powered browser automation assistant. Control the web with natural language.*
 
https://github.com/user-attachments/assets/0c9e870a-64b9-4c3a-b805-cfede39bb00a

BrowserBee is a privacy-first open source Chrome extension that lets you control your browser using natural language. It combines the power of an LLM for instruction parsing and Playwright for robust browser automation.

Since BrowserBee runs entirely within your browser (with the exception of the LLM), it can interact with logged-in websites, like your social media accounts or email, without compromising security or requiring backend infrastructure. This makes it more convenient for personal use than other "browser use" type products out there.

## 🎲 Features 

- Supports major LLM providers such as **Anthropic**, **OpenAI**, and **Gemini**, with more coming soon
- Tracks **token use** and **price** so you know how much you're spending on each task
- Has access to a wide range of **🕹️ browser tools** for interacting and understanding browser state
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
