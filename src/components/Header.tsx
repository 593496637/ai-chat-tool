// src/components/Header.tsx
import React, { useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import StatusIndicator from './StatusIndicator';

const Header: React.FC = () => {
  const { state, dispatch, clearChat, checkConnection } = useChat();
  const { config, connectionStatus, lastError } = state;

  useEffect(() => {
    // 组件挂载时检查连接
    checkConnection();
  }, [checkConnection]);

  const handleMarkdownToggle = (checked: boolean) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: { useMarkdown: checked } });
  };

  const handleGraphQLToggle = (checked: boolean) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: { useGraphQL: checked } });
  };

  const handleRefreshConnection = async () => {
    await checkConnection();
  };

  return (
    <div className="header">
      <div className="header-main">
        <h1>AI 聊天助手</h1>
        <StatusIndicator 
          status={connectionStatus.status}
          endpoint={connectionStatus.endpoint}
          lastChecked={connectionStatus.lastChecked}
          error={connectionStatus.error}
        />
      </div>
      
      {lastError && (
        <div className="error-banner">
          ⚠️ {lastError}
        </div>
      )}

      <div className="controls">
        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.useMarkdown}
              onChange={(e) => handleMarkdownToggle(e.target.checked)}
            />
            <span>Markdown渲染</span>
          </label>
          
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.useGraphQL}
              onChange={(e) => handleGraphQLToggle(e.target.checked)}
            />
            <span>GraphQL模式</span>
          </label>
        </div>

        <div className="button-group">
          <button 
            onClick={handleRefreshConnection}
            className="btn btn-secondary"
            disabled={state.loading}
          >
            🔄 刷新连接
          </button>
          
          <button 
            onClick={clearChat}
            className="btn btn-secondary"
          >
            🗑️ 清空对话
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Header);
