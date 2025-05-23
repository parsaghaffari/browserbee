import React from 'react';

export function AboutSection() {
  return (
    <div className="card bg-base-100 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title text-xl">About</h2>
        <p className="mb-3">
          BrowserBee 🐝 is a Chrome extension that allows you to control your browser using natural language.
          It supports multiple LLM providers including Anthropic, OpenAI, Google Gemini, and Ollama to interpret your instructions and uses Playwright to execute them.
        </p>
        <p>
          To use the extension, click on the extension icon to open the side panel, then enter your instructions
          in the prompt field and hit Enter.
        </p>
      </div>
    </div>
  );
}
