import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  sendChatMessage, 
  testGraphQLConnection, 
  getHealthStatus, 
  refreshGraphQLConnection,
  getGraphQLStatus,
  Message as GraphQLMessage 
} from './graphql';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMarkdown, setUseMarkdown] = useState(true);
  const [useGraphQL, setUseGraphQL] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [lastError, setLastError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef<boolean>(false); // 防止重复初始化

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 检查连接状态 - 简化版本，避免重复请求
  const checkConnection = async () => {
    if (initializationRef.current) {
      console.log('Connection check already in progress, skipping...');
      return;
    }

    initializationRef.current = true;
    setConnectionStatus('unknown');
    setLastError('');
    setDebugInfo('正在初始化连接...');
    
    try {
      console.log('Starting connection check...');
      
      // 并行检查健康状态和GraphQL连接
      const [health, graphqlTest] = await Promise.all([
        getHealthStatus(),
        testGraphQLConnection()
      ]);
      
      if (health && graphqlTest) {
        setConnectionStatus('connected');
        setLastError('');
        const status = getGraphQLStatus();
        setDebugInfo(`连接成功 - 端点: ${status.endpoint}`);
        console.log('Connection check successful');
      } else {
        setConnectionStatus('failed');
        setLastError('无法连接到服务');
        setDebugInfo(`连接失败 - Health: ${!!health}, GraphQL: ${graphqlTest}`);
        console.log('Connection check failed');
      }
    } catch (error) {
      setConnectionStatus('failed');
      const errorMsg = error instanceof Error ? error.message : '连接测试失败';
      setLastError(errorMsg);
      setDebugInfo(`连接错误: ${errorMsg}`);
      console.error('Connection check error:', error);
    } finally {
      initializationRef.current = false;
    }
  };

  // 组件加载时测试连接 - 只执行一次
  useEffect(() => {
    checkConnection();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 手动刷新连接
  const handleRefreshConnection = async () => {
    setDebugInfo('刷新连接中...');
    try {
      const success = await refreshGraphQLConnection();
      if (success) {
        setConnectionStatus('connected');
        setLastError('');
        const status = getGraphQLStatus();
        setDebugInfo(`连接已刷新 - 端点: ${status.endpoint}`);
      } else {
        setConnectionStatus('failed');
        setLastError('连接刷新失败');
        setDebugInfo('连接刷新失败');
      }
    } catch (error) {
      setConnectionStatus('failed');
      const errorMsg = error instanceof Error ? error.message : '刷新失败';
      setLastError(errorMsg);
      setDebugInfo(`刷新错误: ${errorMsg}`);
    }
  };

  // GraphQL 方式发送消息
  const sendMessageGraphQL = async (messageHistory: Message[]) => {
    const graphqlMessages: GraphQLMessage[] = messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await sendChatMessage(graphqlMessages);
      setLastError(''); // 清除之前的错误
      return response.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    } catch (error) {
      console.error('GraphQL请求失败:', error);
      setLastError(`GraphQL错误: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // GraphQL 失败时自动切换到 REST
      console.log('GraphQL请求失败，切换到REST API');
      setUseGraphQL(false);
      return await sendMessageREST(messageHistory);
    }
  };

  // REST API 方式发送消息
  const sendMessageREST = async (messageHistory: Message[]) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messageHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLastError(''); // 清除之前的错误
      return data.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    } catch (error) {
      setLastError(`REST API错误: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      let responseContent: string;
      
      if (useGraphQL) {
        responseContent = await sendMessageGraphQL(newMessages);
      } else {
        responseContent = await sendMessageREST(newMessages);
      }
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        content: responseContent,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: `发生错误：${error instanceof Error ? error.message : '未知错误'}`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setLastError('');
    setDebugInfo('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.role === 'assistant' && useMarkdown) {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      );
    }
    return <div>{message.content}</div>;
  };

  // 连接状态指示器
  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <span style={{color: 'green'}}>🟢 已连接</span>;
      case 'failed':
        return <span style={{color: 'red'}}>🔴 连接失败</span>;
      default:
        return <span style={{color: 'orange'}}>🟡 检查中...</span>;
    }
  };

  return (
    <div className="app">
      {/* 头部 */}
      <div className="header">
        <h1>AI 聊天助手</h1>
        <div className="status">
          {getStatusIndicator()}
          {debugInfo && (
            <span style={{fontSize: '12px', color: '#666', marginLeft: '10px'}}>
              {debugInfo}
            </span>
          )}
        </div>
        <div className="controls">
          <label>
            <input
              type="checkbox"
              checked={useMarkdown}
              onChange={(e) => setUseMarkdown(e.target.checked)}
            />
            Markdown
          </label>
          <label>
            <input
              type="checkbox"
              checked={useGraphQL}
              onChange={(e) => setUseGraphQL(e.target.checked)}
            />
            GraphQL
          </label>
          <button onClick={handleRefreshConnection} disabled={loading}>
            刷新连接
          </button>
          <button onClick={clearChat}>清空</button>
        </div>
      </div>

      {/* 错误提示 */}
      {lastError && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '10px',
          margin: '10px',
          borderRadius: '4px',
          border: '1px solid #ffcdd2'
        }}>
          ⚠️ {lastError}
        </div>
      )}

      {/* 消息区域 */}
      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty">
            <h2>欢迎使用 AI 聊天助手 🤖</h2>
            <p>当前模式: {useGraphQL ? 'GraphQL' : 'REST API'}</p>
            <p>连接状态: {getStatusIndicator()}</p>
            <p>请输入您的问题开始对话</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="content">
                {renderMessageContent(message)}
                <div className="timestamp" style={{
                  fontSize: '11px', 
                  color: '#999', 
                  marginTop: '5px'
                }}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="avatar">🤖</div>
            <div className="content">
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div>正在思考...</div>
                <div className="loading-spinner" style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #f3f3f3',
                  borderTop: '2px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
              <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                使用 {useGraphQL ? 'GraphQL' : 'REST API'} 模式
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          disabled={loading}
          style={{
            resize: 'vertical',
            minHeight: '40px',
            maxHeight: '120px'
          }}
        />
        <button 
          onClick={sendMessage} 
          disabled={!input.trim() || loading}
          style={{
            opacity: (!input.trim() || loading) ? 0.6 : 1,
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '发送中...' : '发送'}
        </button>
      </div>

      {/* CSS动画 */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;