// src/components/StatusIndicator.tsx
import React from 'react';

interface StatusIndicatorProps {
  status: 'unknown' | 'connected' | 'failed';
  endpoint?: string;
  lastChecked?: Date;
  error?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  endpoint,
  lastChecked,
  error
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: '🟢',
          text: '已连接',
          color: '#4CAF50',
          bgColor: '#E8F5E8'
        };
      case 'failed':
        return {
          icon: '🔴',
          text: '连接失败',
          color: '#F44336',
          bgColor: '#FFEBEE'
        };
      default:
        return {
          icon: '🟡',
          text: '检查中...',
          color: '#FF9800',
          bgColor: '#FFF3E0'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="status-indicator">
      <div 
        className="status-main"
        style={{
          color: statusConfig.color,
          backgroundColor: statusConfig.bgColor,
          padding: '4px 12px',
          borderRadius: '16px',
          border: `1px solid ${statusConfig.color}40`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        <span>{statusConfig.icon}</span>
        <span>{statusConfig.text}</span>
      </div>
      
      {(endpoint || lastChecked || error) && (
        <div className="status-details" style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          {endpoint && (
            <div title={`端点: ${endpoint}`}>
              📡 {endpoint.length > 30 ? endpoint.substring(0, 30) + '...' : endpoint}
            </div>
          )}
          
          {lastChecked && (
            <div>
              🕒 最后检查: {formatTime(lastChecked)}
            </div>
          )}
          
          {error && (
            <div style={{ color: '#F44336' }} title={error}>
              ❌ {error.length > 50 ? error.substring(0, 50) + '...' : error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(StatusIndicator);