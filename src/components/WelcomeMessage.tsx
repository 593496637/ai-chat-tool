// src/components/WelcomeMessage.tsx
import React from 'react';

const WelcomeMessage: React.FC = () => {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '60px 20px',
      color: '#6c757d'
    }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        marginBottom: '12px',
        color: '#495057'
      }}>
        🤖 欢迎使用 AI 聊天助手
      </h2>
      <p style={{ 
        fontSize: '14px',
        marginBottom: '20px'
      }}>
        请输入您的问题开始对话
      </p>
      <div style={{
        fontSize: '12px',
        color: '#adb5bd'
      }}>
        💡 支持 Markdown 格式 • Enter 发送 • Shift+Enter 换行
      </div>
    </div>
  );
};

export default WelcomeMessage;