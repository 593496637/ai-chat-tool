// src/components/LoadingMessage.tsx
import React from 'react';

interface LoadingMessageProps {
  useGraphQL: boolean;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({ useGraphQL }) => {
  return (
    <div className="message assistant loading">
      <div className="message-avatar">
        <div className="avatar-loading">🤖</div>
      </div>
      
      <div className="message-content">
        <div className="message-body">
          <div className="loading-content">
            <div className="loading-text">
              <span className="thinking-dots">正在思考</span>
              <div className="dots-animation">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
            
            <div className="loading-spinner-container">
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
        
        <div className="message-meta">
          <span className="api-mode">
            使用 {useGraphQL ? 'GraphQL' : 'REST API'} 模式
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LoadingMessage);