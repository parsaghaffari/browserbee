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

## ✅ Use Cases

- **Social media butler**: Checks your social media accounts, summarizes notifications and messages, and helps you respond.
- **News curator**: Gathers and summarizes the latest headlines from your preferred news sources and blogs, giving you a quick, personalized briefing.
- **Personal assistant**: Helps with everyday tasks like reading and sending emails and messages, booking flights, finding products, and more.
- **Research assistant**: Assists with deep dives into topics like companies, job listings, market trends, and academic publications by gathering and organizing information.
- **Knowledge bookmarking & summarization**: Quickly summarizes articles, extracts key information, and saves useful insights for later reference.

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

## ⚙️ Development

- `npm run dev`: Start the development server
- `npm run build`: Build the extension for production

For detailed information about the architecture, component structure, and code organization, please see [ARCHITECTURE.md](ARCHITECTURE.md).

## 📜 License

[Apache 2.0](LICENSE)

## 🫂 Acknowledgements

BrowserBee is built using these amazing open source projects:

- [Cline](https://github.com/cline/cline) enabled us to vibe-code the first version of BrowserBee and inspired us to build a "Cline for the web"
- [playwright-crx](https://github.com/ruifigueira/playwright-crx) by [@ruifigueira](https://github.com/ruifigueira) for in-browser use of Playwright
- [playwright-mcp](https://github.com/microsoft/playwright-mcp) for the browser tool implementations
