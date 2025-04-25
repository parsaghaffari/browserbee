import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LlmContentProps {
  content: string;
}

export const LlmContent: React.FC<LlmContentProps> = ({ content }) => {
  // Split content into regular text and tool calls
  const parts: Array<{ type: 'text' | 'tool', content: string }> = [];
  
  // Process the content to identify tool calls
  const toolCallRegex = /<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>/g;
  let lastIndex = 0;
  
  // Create a copy of the content to work with
  const contentCopy = content.toString();
  
  // Reset regex lastIndex
  toolCallRegex.lastIndex = 0;
  
  let match;
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
