// src/components/WelcomeMessage.tsx
import React from 'react';

interface WelcomeMessageProps {
  useGraphQL: boolean;
  connectionStatus: 'unknown' | 'connected' | 'failed';
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ 
  useGraphQL, 
  connectionStatus 
}) => {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'failed': return '🔴';
      default: return '🟡';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '已连接';
      case 'failed': return '连接失败';
      default: return '检查中';
    }
  };

  return (
    <div className="welcome-message">
      <div className="welcome-content">
        <div className="welcome-header">
          <h2>🤖 欢迎使用 AI 聊天助手</h2>
          <div className="welcome-subtitle">
            智能对话，随时随地为您解答疑问
          </div>
        </div>

        <div className="welcome-info">
          <div className="info-row">
            <span className="info-label">🔧 当前模式:</span>
            <span className="info-value">
              {useGraphQL ? 'GraphQL API' : 'REST API'}
            </span>
          </div>
          
          <div className="info-row">
            <span className="info-label">📡 连接状态:</span>
            <span className="info-value">
              {getStatusIcon()} {getStatusText()}
            </span>
          </div>
        </div>

        <div className="welcome-features">
          <h3>✨ 功能特色</h3>
          <ul>
            <li>🎨 支持Markdown格式渲染</li>
            <li>⚡ GraphQL + REST API双模式</li>
            <li>🔄 智能重试和错误恢复</li>
            <li>📱 响应式设计，完美适配各设备</li>
            <li>🚀 基于DeepSeek AI，回答更智能</li>
          </ul>
        </div>

        <div className="welcome-tips">
          <h3>💡 使用提示</h3>
          <div className="tips-grid">
            <div className="tip-item">
              <span className="tip-icon">⌨️</span>
              <span>Enter 发送消息</span>
            </div>
            <div className="tip-item">
              <span className="tip-icon">↵️</span>
              <span>Shift+Enter 换行</span>
            </div>
            <div className="tip-item">
              <span className="tip-icon">📝</span>
              <span>支持Markdown语法</span>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🔧</span>
              <span>可切换API模式</span>
            </div>
          </div>
        </div>

        <div className="welcome-start">
          <p>🎯 <strong>现在就开始对话吧！</strong></p>
          <p>您可以问我任何问题，比如：</p>
          <div className="example-questions">
            <span className="example-tag">编程技术</span>
            <span className="example-tag">学习方法</span>
            <span className="example-tag">生活建议</span>
            <span className="example-tag">创意想法</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WelcomeMessage);