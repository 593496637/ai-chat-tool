// src/components/Header.tsx
import React from 'react';
import { useChat } from '../hooks/useChat';

const Header: React.FC = () => {
  const { clearChat } = useChat();

  return (
    <div className="header">
      <h1>AI 聊天助手</h1>
      <button onClick={clearChat} className="clear-button">
        清空对话
      </button>
    </div>
  );
};

export default Header;
