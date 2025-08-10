// src/components/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';
import WelcomeMessage from './WelcomeMessage';

const MessageList: React.FC = () => {
  const { state } = useChat();
  const { messages, loading, config } = state;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, [messages, loading]);

  return (
    <div className="messages-container">
      <div className="messages">
        {messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              useMarkdown={config.useMarkdown}
            />
          ))
        )}

        {loading && (
          <div className="message assistant">
            <div className="avatar">🤖</div>
            <div className="content">
              <div>正在思考中...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default React.memo(MessageList);
