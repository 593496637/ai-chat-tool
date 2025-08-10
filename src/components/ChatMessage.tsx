// src/components/ChatMessage.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  useMarkdown: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, useMarkdown }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderContent = () => {
    if (message.role === 'assistant' && useMarkdown) {
      return (
        <div className="markdown-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // 自定义代码块样式
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !className;
                
                return !isInline && match ? (
                  <pre className={`language-${match[1]}`}>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // 自定义链接样式
              a({ children, href, ...props }) {
                return (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
              // 自定义表格样式
              table({ children, ...props }) {
                return (
                  <div className="table-wrapper">
                    <table {...props}>{children}</table>
                  </div>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }
    
    return (
      <div className="text-content">
        {message.content}
      </div>
    );
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {message.role === 'user' ? '👤' : '🤖'}
      </div>
      
      <div className="message-content">
        <div className="message-body">
          {renderContent()}
        </div>
        
        <div className="message-meta">
          <span className="message-time">
            {formatTime(message.timestamp)}
          </span>
          
          {message.role === 'assistant' && (
            <span className="message-role">
              AI助手
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
