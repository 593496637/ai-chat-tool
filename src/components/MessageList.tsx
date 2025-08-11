// src/components/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';

const MessageList: React.FC = () => {
  const { state } = useChat();
  const { messages, loading } = state;
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
          <div className="welcome-message">
            <h2>🤖 欢迎使用 AI 聊天助手</h2>
            <p>请输入您的问题开始对话</p>
            <div className="welcome-hints">
              💡 支持 Markdown 格式 • Enter 发送 • Shift+Enter 换行
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              useMarkdown={true}
            />
          ))
        )}

        {loading && (
          <div className="message assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-body">正在思考中...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default React.memo(MessageList);
