// src/components/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';
import LoadingMessage from './LoadingMessage';
import WelcomeMessage from './WelcomeMessage';

const MessageList: React.FC = () => {
  const { state } = useChat();
  const { messages, loading, config, connectionStatus } = state;
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
          <WelcomeMessage 
            useGraphQL={config.useGraphQL}
            connectionStatus={connectionStatus.status}
          />
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
          <LoadingMessage useGraphQL={config.useGraphQL} />
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default React.memo(MessageList);
