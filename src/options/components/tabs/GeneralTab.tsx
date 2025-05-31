import React from 'react';
import { AboutSection } from '../AboutSection';

export function GeneralTab() {
  return (
    <div className="space-y-6">
      <AboutSection />
      
      {/* Getting Started Guide */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl">🚀 Getting Started</h2>
          <p className="mb-4">
            Follow these simple steps to start using BrowserBee:
          </p>
          
          {/* Demo Video */}
          <div className="mb-6">
            <div className="aspect-video w-full max-w-2xl mx-auto">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/SFBelCiZq_4"
                title="BrowserBee Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          </div>
          
          {/* Step-by-step instructions */}
          <div className="steps steps-vertical lg:steps-horizontal w-full">
            <div className="step step-primary">
              <div className="step-content text-left">
                <h3 className="font-semibold text-lg mb-2">1. Get an API Key</h3>
                <p className="text-sm mb-2">
                  Obtain an API key from one of these LLM providers:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                  <li><strong>Anthropic</strong> - Recommended for best performance</li>
                  <li><strong>OpenAI</strong> - Popular and reliable</li>
                  <li><strong>Google Gemini</strong> - Good value for money</li>
                  <li><strong>Ollama</strong> - Free local models</li>
                </ul>
              </div>
            </div>
            
            <div className="step step-primary">
              <div className="step-content text-left">
                <h3 className="font-semibold text-lg mb-2">2. Configure BrowserBee</h3>
                <p className="text-sm mb-2">
                  Go to the <strong>LLM Configuration</strong> tab and:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                  <li>Select your preferred provider</li>
                  <li>Enter your API key</li>
                  <li>Click <strong>Save Settings</strong></li>
                </ul>
              </div>
            </div>
            
            <div className="step step-primary">
              <div className="step-content text-left">
                <h3 className="font-semibold text-lg mb-2">3. Run Your First Task</h3>
                <p className="text-sm mb-2">
                  Try this example to get started:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                  <li>Open a new tab and go to <code className="bg-base-200 px-1 rounded">google.com</code></li>
                  <li>Click the BrowserBee icon or press <kbd className="kbd kbd-xs">Alt</kbd>+<kbd className="kbd kbd-xs">Shift</kbd>+<kbd className="kbd kbd-xs">B</kbd></li>
                  <li>Type: <em>"Search for the weather in Paris"</em></li>
                  <li>Press Enter and watch BrowserBee work! 🐝</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Important Tips */}
          <div className="alert alert-info mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="font-bold">💡 Pro Tips</h3>
              <ul className="text-sm mt-2 space-y-1">
                <li>• <strong>Keep BrowserBee attached:</strong> Leave it connected to a tab throughout your session for best performance</li>
                <li>• <strong>Reattach if needed:</strong> If you close the attached tab, use the <strong>reattach</strong> button to reconnect</li>
                <li>• <strong>One per window:</strong> You can run one BrowserBee instance per Chrome window</li>
                <li>• <strong>Tab limitations:</strong> BrowserBee can't attach to new tabs or chrome:// pages</li>
              </ul>
            </div>
          </div>
          
          {/* Support Section */}
          <div className="divider">Need Help?</div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a 
              href="https://discord.gg/g42ww3wn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary btn-wide"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Discord Community
            </a>
            
            <div className="text-center">
              <p className="text-sm text-base-content/70">
                Get help, share tips, and connect with other BrowserBee users
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
