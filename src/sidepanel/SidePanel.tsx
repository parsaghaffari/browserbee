import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Component to handle LLM content with tool calls
const LlmContent = ({ content }: { content: string }) => {
  // Split content into regular text and tool calls
  const parts: Array<{ type: 'text' | 'tool', content: string }> = [];
  
  // Process the content to identify tool calls
  let remainingContent = content;
  let match;
  const toolCallRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/g;
  let lastIndex = 0;
  
  // Create a copy of the content to work with
  const contentCopy = content.toString();
  
  // Reset regex lastIndex
  toolCallRegex.lastIndex = 0;
  
  while ((match = toolCallRegex.exec(contentCopy)) !== null) {
    // Add text before the tool call
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: contentCopy.substring(lastIndex, match.index)
      });
    }
    
    // Add the tool call
    parts.push({
      type: 'tool',
      content: match[0]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text after the last tool call
  if (lastIndex < contentCopy.length) {
    parts.push({
      type: 'text',
      content: contentCopy.substring(lastIndex)
    });
  }

  // If no tool calls were found, just return the whole content
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: content
    });
  }
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          // Render regular text with markdown
          return (
            <ReactMarkdown 
              key={index}
              remarkPlugins={[remarkGfm]}
              components={{
                // Apply Tailwind classes to markdown elements
                p: ({node, ...props}) => <p className="mb-2" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                a: ({node, ...props}) => <a className="text-primary underline" {...props} />,
                code: ({node, className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !className;
                  return isInline 
                    ? <code className="bg-base-300 px-1 rounded text-sm" {...props}>{children}</code>
                    : <pre className="bg-base-300 p-2 rounded text-sm overflow-auto my-2"><code {...props}>{children}</code></pre>;
                },
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-base-300 pl-4 italic my-2" {...props} />,
                table: ({node, ...props}) => <table className="border-collapse table-auto w-full my-2" {...props} />,
                th: ({node, ...props}) => <th className="border border-base-300 px-4 py-2 text-left" {...props} />,
                td: ({node, ...props}) => <td className="border border-base-300 px-4 py-2" {...props} />,
              }}
            >
              {part.content}
            </ReactMarkdown>
          );
        } else {
          // Render tool calls with special styling
          // Extract tool name and input for better display
          const toolMatch = part.content.match(/<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/);
          if (toolMatch) {
            const [, toolName, toolInput] = toolMatch;
            return (
              <div key={index} className="hidden">
                {/* Tool call is hidden since it will be shown in the system message */}
              </div>
            );
          }
          return null;
        }
      })}
    </>
  );
};

// Define message types
type MessageType = 'system' | 'llm';

interface Message {
  type: MessageType;
  content: string;
}

export function SidePanel() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSystemMessages, setShowSystemMessages] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  // Filter messages based on showSystemMessages toggle
  const filteredMessages = showSystemMessages 
    ? messages 
    : messages.filter(msg => msg.type === 'llm');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);
    setMessages([]);

    try {
      // Send message to background script
      chrome.runtime.sendMessage({ 
        action: 'executePrompt', 
        prompt 
      }, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          setMessages([{ type: 'system', content: 'Error: ' + chrome.runtime.lastError.message }]);
          setIsProcessing(false);
          return;
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setMessages([{ 
        type: 'system', 
        content: 'Error: ' + (error instanceof Error ? error.message : String(error)) 
      }]);
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    chrome.runtime.sendMessage({ 
      action: 'cancelExecution' 
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages, showSystemMessages]);

  // Listen for updates from the background script
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'updateOutput') {
        setMessages(prev => [...prev, message.content]);
      } else if (message.action === 'updateLlmOutput') {
        // Handle legacy format for backward compatibility
        setMessages(prev => [...prev, { type: 'llm', content: message.content }]);
      } else if (message.action === 'processingComplete') {
        setIsProcessing(false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  return (
    <div className="flex flex-col h-screen p-4 bg-base-200">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-primary">Browser LLM ✨</h1>
        <p className="text-sm text-gray-600">
          What can I do for you today?
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col mb-4">
        <textarea
          className="textarea textarea-bordered w-full mb-2"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt (e.g., 'go to google.com, search for Cicero, and click on the first result')"
          disabled={isProcessing}
          rows={4}
        />
        <div className="flex justify-end gap-2">
          {isProcessing && (
            <button 
              type="button" 
              onClick={handleCancel}
              className="btn btn-error"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isProcessing || !prompt.trim()}
          >
            {isProcessing ? 'Processing...' : 'Execute'}
          </button>
        </div>
      </form>

      <div className="flex flex-col flex-grow gap-4 overflow-hidden md:flex-row">
        <div className="card bg-base-100 shadow-md flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center bg-base-300 p-3">
            <div className="card-title text-base-content text-lg">
              LLM Output
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text mr-2">System messages</span> 
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary toggle-sm" 
                  checked={showSystemMessages}
                  onChange={() => setShowSystemMessages(!showSystemMessages)}
                />
              </label>
            </div>
          </div>
          <div 
            ref={outputRef}
            className="card-body p-3 overflow-auto bg-base-100 flex-1"
          >
            {filteredMessages.length > 0 ? (
              <div>
                {filteredMessages.map((msg, index) => (
                  <div key={index} className="mb-2">
                    {msg.type === 'system' ? (
                      <div className="bg-base-200 px-3 py-1 rounded text-gray-500 text-sm">
                        {msg.content}
                      </div>
                    ) : (
                      <LlmContent content={msg.content} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No output yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
